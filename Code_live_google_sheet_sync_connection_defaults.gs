/**
 * OPD CRM — LIVE GOOGLE SHEET SYNC
 *
 * Required Script Properties:
 *   EDGE_FUNCTION_URL = https://<project>.supabase.co/functions/v1/opd-sheet-sync
 *   CRM_SYNC_TOKEN    = same token configured in the Edge Function
 *
 * Deploy as Web App:
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * Run setupTrigger() once.
 */

const LIVE_CFG = {
  edgeUrl: PropertiesService.getScriptProperties().getProperty('EDGE_FUNCTION_URL'),
  token: PropertiesService.getScriptProperties().getProperty('CRM_SYNC_TOKEN'),
  maxRowsPerRun: 500
};

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function edge_(action, payload) {
  if (!LIVE_CFG.edgeUrl) throw new Error('EDGE_FUNCTION_URL is not configured');
  if (!LIVE_CFG.token) throw new Error('CRM_SYNC_TOKEN is not configured');

  const body = Object.assign({action: action}, payload || {});
  const res = UrlFetchApp.fetch(LIVE_CFG.edgeUrl, {
    method: 'post',
    contentType: 'application/json',
    headers: {'x-crm-token': LIVE_CFG.token},
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });

  const text = res.getContentText();
  let data;
  try { data = JSON.parse(text); }
  catch (_) { throw new Error('Edge Function returned non-JSON: ' + text.slice(0, 500)); }

  if (res.getResponseCode() >= 400 || data.ok === false) {
    throw new Error(data.error || ('Edge Function HTTP ' + res.getResponseCode()));
  }
  return data;
}

function doGet() {
  return json_({ok: true, service: 'opd-live-sheet-sync'});
}

function doPost(e) {
  try {
    const body = e && e.postData && e.postData.contents
      ? JSON.parse(e.postData.contents)
      : {};

    if (body.action === 'sync') {
      return json_(syncConnection(body.connection_id));
    }

    if (body.action === 'sync_all') {
      return json_(syncAllActiveConnections());
    }

    return json_({ok: false, error: 'Unknown action'});
  } catch (err) {
    return json_({ok: false, error: String(err && err.message || err)});
  }
}

function setupTrigger() {
  // Remove duplicate old triggers for this handler first.
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'syncAllActiveConnections') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('syncAllActiveConnections')
    .timeBased()
    .everyMinutes(1)
    .create();
}

function syncAllActiveConnections() {
  const data = edge_('get_connections');
  const connections = data.connections || [];
  const results = [];

  connections.forEach(function(c) {
    try {
      results.push(syncConnection(c.id));
    } catch (err) {
      results.push({
        ok: false,
        connection_id: c.id,
        error: String(err && err.message || err)
      });
    }
  });

  return {ok: true, synced: results};
}

function syncConnection(connectionId) {
  if (!connectionId) throw new Error('connection_id is required');

  const data = edge_('get_connection', {id: connectionId});
  const c = data.connection;
  if (!c) throw new Error('Connection not found');
  if (!c.active) return {ok: true, skipped: true, reason: 'inactive', connection_id: c.id};

  const ss = SpreadsheetApp.openByUrl(c.sheet_url);
  const sh = ss.getSheetByName(c.tab_name || 'Sheet1');
  if (!sh) throw new Error('Tab not found: ' + (c.tab_name || 'Sheet1'));

  const values = sh.getDataRange().getValues();
  if (values.length < 2) {
    edge_('update_connection', {
      id: c.id,
      patch: {
        last_sync_at: new Date().toISOString(),
        last_sync_status: 'active',
        last_sync_message: 'No data rows found',
        updated_at: new Date().toISOString()
      }
    });
    return {ok: true, inserted: 0, duplicates: 0, skipped: 0, processed_rows: 0};
  }

  const headers = values[0].map(function(v) {
    return String(v == null ? '' : v).trim().toLowerCase().replace(/\s+/g, ' ');
  });

  function findHeader_(aliases) {
    for (let i = 0; i < aliases.length; i++) {
      const target = String(aliases[i]).toLowerCase();
      const idx = headers.indexOf(target);
      if (idx >= 0) return idx;
    }
    return -1;
  }

  const nameAliases = [];
  if (c.name_column) nameAliases.push(String(c.name_column).trim().toLowerCase());
  nameAliases.push('patient name','patient_name','full name','full_name','name','first_name');

  const phoneAliases = [];
  if (c.phone_column) phoneAliases.push(String(c.phone_column).trim().toLowerCase());
  phoneAliases.push('phone number','phone','mobile number','mobile','contact number','contact','whatsapp_number','whatsapp number','number','phn');

  const hospitalAliases = ['hospital','hospital name','hospital_name'];
  const callingDateAliases = ['calling date','calling_date','date of call','call date'];
  const statusAliases = ['calling status','status'];
  const stageAliases = ['opd status','stage'];
  const visitAliases = ['visit','visit status','visit outcome'];
  const remarksAliases = ['comments','comment','remarks','remark'];
  const couponAliases = ['coupon code','coupon_code','discount code','discount_code'];

  const nameIdx = findHeader_(nameAliases);
  const phoneIdx = findHeader_(phoneAliases);
  const hospitalIdx = findHeader_(hospitalAliases);
  const callingDateIdx = findHeader_(callingDateAliases);
  const statusIdx = findHeader_(statusAliases);
  const stageIdx = findHeader_(stageAliases);
  const visitIdx = findHeader_(visitAliases);
  const remarksIdx = findHeader_(remarksAliases);
  const couponIdx = findHeader_(couponAliases);

  if (phoneIdx < 0) throw new Error('Phone column not found in tab ' + sh.getName());
  if (nameIdx < 0) throw new Error('Patient/name column not found in tab ' + sh.getName());

  const startRow = Math.max(2, Number(c.last_processed_row || 1) + 1);
  const endRow = Math.min(values.length, startRow - 1 + LIVE_CFG.maxRowsPerRun);

  let inserted = 0, duplicates = 0, skipped = 0, errors = 0;
  let lastGoodRow = Number(c.last_processed_row || 1);
  const errorMessages = [];

  function normalizePhone_(v) {
    let d = String(v == null ? '' : v).replace(/\D/g, '');
    if (d.length === 12 && d.indexOf('91') === 0) d = d.substring(2);
    if (d.length > 10) d = d.substring(d.length - 10);
    return d.length === 10 ? d : '';
  }

  function isoDate_(v) {
    if (v === '' || v == null) return null;
    if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) {
      return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }
    const s = String(v).trim();
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
    const row = values[rowIndex - 1];
    const sheetRow = rowIndex;
    const phone = normalizePhone_(row[phoneIdx]);
    const patient = String(row[nameIdx] == null ? '' : row[nameIdx]).trim();

    if (!phone || !patient) {
      skipped++;
      lastGoodRow = sheetRow;
      continue;
    }

    const record = {
      patient_name: patient,
      phone: phone,
      source_id: c.source_id,
      campaign_id: c.campaign_id,
      hospital: c.hospital || null,
      coupon_code: c.coupon_code || null,
      source_row_key: 'live:' + c.id + ':row:' + sheetRow,
      remarks: remarksIdx >= 0 ? String(row[remarksIdx] || '').trim() : null
    };

    try {
      const result = edge_('insert_lead', record);
      const r = result.result || result;

      if (r && r.duplicate) duplicates++;
      else if (r && r.inserted !== false) inserted++;
      else duplicates++;

      lastGoodRow = sheetRow;
    } catch (err) {
      errors++;
      errorMessages.push('Row ' + sheetRow + ': ' + String(err && err.message || err));
      // Stop here so a transient API error can be retried safely.
      break;
    }
  }

  const reached = lastGoodRow >= endRow;
  const patch = {
    last_sync_at: new Date().toISOString(),
    last_sync_status: errors ? 'error' : 'active',
    last_sync_message: errors
      ? errorMessages.slice(0, 3).join(' | ')
      : ('Inserted ' + inserted + ', duplicates ' + duplicates + ', skipped ' + skipped),
    last_processed_row: lastGoodRow,
    updated_at: new Date().toISOString()
  };

  try {
    edge_('update_connection', {id: c.id, patch: patch});
  } catch (statusErr) {
    errors++;
    errorMessages.push('Connection status update failed: ' + String(statusErr));
  }

  return {
    ok: errors === 0,
    connection_id: c.id,
    sheet: c.name,
    tab: c.tab_name,
    inserted: inserted,
    duplicates: duplicates,
    skipped: skipped,
    errors: errors,
    last_processed_row: lastGoodRow,
    more_rows: !reached,
    messages: errorMessages
  };
}
