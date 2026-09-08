/**
 * OPD CRM - HISTORICAL BACKFILL IMPORT
 *
 * This is the REAL import. It writes through the existing Edge Function.
 *
 * Required Script Properties:
 * EDGE_FUNCTION_URL = your deployed opd-sheet-sync URL
 * CRM_SYNC_TOKEN = same token configured in Supabase Edge Function
 *
 * DO NOT run until the Edge Function has been updated with the backfill actions.
 *
 * Caller mapping requested by the user:
 * Deepam -> Ranajit
 * Vrushabh -> Shawn
 * Nizam -> Nizam
 * Ranajith -> Ranajit
 * Ranajit -> Ranajit
 * Shawn -> Shawn
 */

const IMPORT_CONFIG_ = {
  edgeFunctionUrl: PropertiesService.getScriptProperties().getProperty('EDGE_FUNCTION_URL'),
  token: PropertiesService.getScriptProperties().getProperty('CRM_SYNC_TOKEN'),

  batchSize: 25,

  callerMapping: {
    'Deepam': 'Ranajit',
    'Vrushabh': 'Shawn',
    'Nizam': 'Nizam',
    'Ranajith': 'Ranajit',
    'Ranajit': 'Ranajit',
    'Shawn': 'Shawn'
  },

  sources: [
    {
      key: 'hospital_cta',
      label: 'Hospital CTA',
      sourceName: 'Hospital CTA',
      url: 'https://docs.google.com/spreadsheets/d/1IWgFBRPduP4dCG0kQzajyH9pLS2OQR1kI4XRkkfNNW0/edit?gid=0#gid=0',
      nameAliases: ['patient name', 'name', 'full name', 'full_name'],
      phoneAliases: ['phone number', 'phone', 'mobile number', 'mobile', 'contact number', 'contact'],
      campaignAliases: ['campaign name', 'campaign', 'camp name'],
      dateAliases: ['campaign date', 'date', 'calling date'],
      callerAliases: ['caller', 'caller name', 'caller_name'],
      statusAliases: ['status', 'calling status'],
      stageAliases: ['stage', 'opd status'],
      couponAliases: ['coupon code', 'discount code', 'discount'],
      remarksAliases: ['comments', 'remarks', 'comment'],
      hospitalAliases: ['hospital', 'hospital name']
    },
    {
      key: 'meta_ads',
      label: 'Meta Ads',
      sourceName: 'Meta Leads',
      url: 'https://docs.google.com/spreadsheets/d/1TFkUgh00gXz5EQk-DTg7xeJ84aT3wk61d2jh20R2rYw/edit?gid=0#gid=0',
      nameAliases: ['full_name', 'full name', 'patient name', 'name'],
      phoneAliases: ['whatsapp_number', 'whatsapp number', 'phone', 'phone number', 'mobile', 'mobile number', 'contact'],
      campaignAliases: ['campaign_name', 'campaign name', 'campaign', 'camp name'],
      dateAliases: ['calling date', 'campaign date', 'date'],
      callerAliases: ['caller', 'caller name', 'caller_name'],
      statusAliases: ['status', 'calling status'],
      stageAliases: ['stage', 'opd status'],
      couponAliases: ['coupon code', 'discount code', 'discount'],
      remarksAliases: ['comments', 'remarks', 'comment'],
      hospitalAliases: ['hospital', 'hospital name']
    },
    {
      key: 'rcs',
      label: 'RCS',
      sourceName: 'RCS',
      url: 'https://docs.google.com/spreadsheets/d/14j6UHxUvzo7T2u1yMnoY3JFtvDGwDGHjVbzFPiUDwCI/edit?gid=0#gid=0',
      nameAliases: ['name', 'patient name', 'full name', 'full_name'],
      phoneAliases: ['phonenumber', 'phone number', 'number', 'phone', 'mobile', 'mobile number'],
      campaignAliases: ['camp name', 'campaign name', 'campaign', 'campaign_name'],
      dateAliases: ['calling date', 'date', 'campaign date'],
      callerAliases: ['caller name', 'caller', 'caller_name'],
      statusAliases: ['status', 'calling status'],
      stageAliases: ['stage', 'opd status'],
      couponAliases: ['coupon code', 'discount code', 'discount'],
      remarksAliases: ['comments', 'remarks', 'comment'],
      hospitalAliases: ['hospital', 'hospital name']
    },
    {
      key: 'whatsapp_cta',
      label: 'WhatsApp CTA',
      sourceName: 'WhatsApp CTA',
      url: 'https://docs.google.com/spreadsheets/d/1_TAEMb5ZYcok_uRXwh95WBFl5isWiiiGonWiebwFr_A/edit?gid=0#gid=0',
      nameAliases: ['name', 'patient name', 'full name', 'full_name'],
      phoneAliases: ['number', 'phone', 'phone number', 'mobile', 'mobile number'],
      campaignAliases: ['camp name', 'campaign name', 'campaign', 'campaign_name'],
      dateAliases: ['calling date', 'date', 'campaign date'],
      callerAliases: ['caller name', 'caller', 'caller_name'],
      statusAliases: ['status', 'calling status'],
      stageAliases: ['stage', 'opd status'],
      couponAliases: ['coupon code', 'discount code', 'discount'],
      remarksAliases: ['comments', 'remarks', 'comment'],
      hospitalAliases: ['hospital', 'hospital name']
    },
    {
      key: 'hospital_dump',
      label: 'Hospital Dump',
      sourceName: 'Hospital Dump',
      url: 'https://docs.google.com/spreadsheets/d/1j_FOCySHq-X7uvT2CzkKuCu3_zmAFrjWPMVfLqiO3SM/edit?gid=0#gid=0',
      nameAliases: ['patient name', 'name', 'full name', 'full_name'],
      phoneAliases: ['mobile number', 'phone number', 'phone', 'mobile', 'contact number'],
      campaignAliases: ['camp name', 'campaign name', 'campaign', 'campaign_name'],
      dateAliases: ['calling date', 'campaign date', 'visit date', 'date'],
      callerAliases: ['caller', 'caller name', 'caller_name'],
      statusAliases: ['status', 'calling status'],
      stageAliases: ['stage', 'opd status'],
      couponAliases: ['coupon code', 'discount code', 'discount'],
      remarksAliases: ['comments', 'remarks', 'comment'],
      hospitalAliases: ['hospital', 'hospital name']
    }
  ],

  coreOpd: {
    label: 'Core OPD',
    url: 'https://docs.google.com/spreadsheets/d/14yZF75MUH3dYSvIik_OsSX2sRXuUOHdoJkK4_Z8tTmo/edit?gid=927505191#gid=927505191',
    nameAliases: ['patient name', 'name', 'full name', 'full_name'],
    phoneAliases: ['phone number', 'phone', 'mobile number', 'mobile', 'contact number'],
    campaignAliases: ['campaign name', 'campaign', 'camp name'],
    dateAliases: ['campaign date', 'booking date', 'visit date', 'date'],
    callerAliases: ['caller', 'caller name', 'caller_name'],
    statusAliases: ['status', 'calling status'],
    stageAliases: ['stage', 'opd status'],
    couponAliases: ['coupon code', 'discount code', 'discount'],
    remarksAliases: ['comments', 'remarks', 'comment'],
    hospitalAliases: ['hospital', 'hospital name'],
    doctorAliases: ['doctor', 'doctor name'],
    departmentAliases: ['department', 'dept'],
    visitAliases: ['visit']
  }
};

function runHistoricalBackfill() {
  validateImportConfig_();

  const totals = {
    sources: {},
    core_opd: { matched: 0, booking_inserted: 0, duplicates: 0, skipped: 0, errors: 0 },
    total_inserted: 0,
    total_duplicates: 0,
    total_skipped: 0,
    total_errors: 0
  };

  IMPORT_CONFIG_.sources.forEach(cfg => {
    const result = importSourceSheet_(cfg);
    totals.sources[cfg.label] = result;
    totals.total_inserted += result.inserted;
    totals.total_duplicates += result.duplicates;
    totals.total_skipped += result.skipped;
    totals.total_errors += result.errors;
  });

  const coreResult = importCoreOpd_(IMPORT_CONFIG_.coreOpd);
  totals.core_opd = coreResult;
  totals.total_inserted += coreResult.leads_created || 0;
  totals.total_duplicates += coreResult.duplicates || 0;
  totals.total_skipped += coreResult.skipped || 0;
  totals.total_errors += coreResult.errors || 0;

  Logger.log('========== HISTORICAL BACKFILL COMPLETE ==========');
  Logger.log(JSON.stringify(totals, null, 2));
  return totals;
}

function importSourceSheet_(cfg) {
  const sh = openImportSheet_(cfg.url);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return { inserted: 0, duplicates: 0, skipped: 0, errors: 0 };

  const idx = mapSourceHeaders_(values[0], cfg);
  if (idx.phone < 0) throw new Error(cfg.label + ': phone column not found.');
  if (idx.name < 0) throw new Error(cfg.label + ': name column not found.');

  const records = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const phone = normalizeImportPhone_(getCell_(row, idx.phone));
    const name = String(getCell_(row, idx.name) || '').trim();
    if (!phone) continue;

    records.push({
      source_name: cfg.sourceName,
      source_row_key: `historical:${cfg.key}:row:${r + 1}`,
      patient_name: name || 'Unknown Patient',
      phone: String(getCell_(row, idx.phone) || '').trim(),
      campaign_name: getCellText_(row, idx.campaign),
      campaign_date: toIsoDate_(getCell_(row, idx.date)),
      caller_name: getCellText_(row, idx.caller),
      calling_status: getCellText_(row, idx.status),
      opd_status: getCellText_(row, idx.stage),
      coupon_code: getCellText_(row, idx.coupon),
      remarks: getCellText_(row, idx.remarks),
      hospital: getCellText_(row, idx.hospital),
      calling_date: toIsoDateTime_(getCell_(row, idx.date)),
      follow_up_date: null,
      follow_up_time: null
    });
  }

  return sendBatches_(records, 'backfill_lead_batch');
}

function importCoreOpd_(cfg) {
  const sh = openImportSheet_(cfg.url);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return { matched: 0, booking_inserted: 0, duplicates: 0, skipped: 0, errors: 0, leads_created: 0 };

  const lower = values[0].map(normalizeImportHeader_);
  const idx = {
    name: findImportHeader_(lower, cfg.nameAliases),
    phone: findImportHeader_(lower, cfg.phoneAliases),
    campaign: findImportHeader_(lower, cfg.campaignAliases),
    date: findImportHeader_(lower, cfg.dateAliases),
    caller: findImportHeader_(lower, cfg.callerAliases),
    status: findImportHeader_(lower, cfg.statusAliases),
    stage: findImportHeader_(lower, cfg.stageAliases),
    coupon: findImportHeader_(lower, cfg.couponAliases),
    remarks: findImportHeader_(lower, cfg.remarksAliases),
    hospital: findImportHeader_(lower, cfg.hospitalAliases),
    doctor: findImportHeader_(lower, cfg.doctorAliases),
    department: findImportHeader_(lower, cfg.departmentAliases),
    visit: findImportHeader_(lower, cfg.visitAliases)
  };

  if (idx.phone < 0) throw new Error('Core OPD: phone column not found.');

  const records = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const phone = normalizeImportPhone_(getCell_(row, idx.phone));
    if (!phone) continue;

    const bookingDateCell = idx.visit >= 0 && getCell_(row, idx.visit) ? getCell_(row, idx.visit) : getCell_(row, idx.date);

    records.push({
      source_row_key: String(r + 1),
      patient_name: getCellText_(row, idx.name),
      phone: String(getCell_(row, idx.phone) || '').trim(),
      campaign_name: getCellText_(row, idx.campaign) || 'Historical OPD',
      campaign_date: toIsoDate_(getCell_(row, idx.date)),
      caller_name: getCellText_(row, idx.caller),
      calling_status: getCellText_(row, idx.status),
      opd_status: getCellText_(row, idx.stage),
      coupon_code: getCellText_(row, idx.coupon),
      remarks: getCellText_(row, idx.remarks),
      hospital: getCellText_(row, idx.hospital),
      doctor_name: getCellText_(row, idx.doctor),
      department: getCellText_(row, idx.department),
      booking_date: toIsoDate_(bookingDateCell)
    });
  }

  const result = sendBatches_(records, 'backfill_core_opd_batch');
  result.leads_created = result.leads_created || 0;
  return result;
}

function sendBatches_(records, action) {
  const totals = {
    inserted: 0, duplicates: 0, skipped: 0, errors: 0,
    matched: 0, booking_inserted: 0, leads_created: 0
  };

  for (let i = 0; i < records.length; i += IMPORT_CONFIG_.batchSize) {
    const batch = records.slice(i, i + IMPORT_CONFIG_.batchSize);
    const response = callEdge_(action, batch);

    if (!response.ok) throw new Error(action + ': ' + JSON.stringify(response));

    const r = response.result || {};
    Object.keys(totals).forEach(k => {
      if (typeof r[k] === 'number') totals[k] += r[k];
    });

    Logger.log('%s: batch %s-%s / %s -> %s',
      action, i + 1, Math.min(i + batch.length, records.length),
      records.length, JSON.stringify(r));
  }

  return totals;
}

function callEdge_(action, records) {
  const url = IMPORT_CONFIG_.edgeFunctionUrl;
  if (!url || !IMPORT_CONFIG_.token) {
    throw new Error('Set EDGE_FUNCTION_URL and CRM_SYNC_TOKEN in Script Properties.');
  }

  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-crm-token': IMPORT_CONFIG_.token },
    payload: JSON.stringify({
      action,
      records,
      caller_mapping: IMPORT_CONFIG_.callerMapping,
      include_details: true
    }),
    muteHttpExceptions: true
  });

  const code = res.getResponseCode();
  const text = res.getContentText();
  if (code < 200 || code >= 300) throw new Error('Edge Function ' + code + ': ' + text.slice(0, 1500));

  return JSON.parse(text);
}

function openImportSheet_(url) {
  const ss = SpreadsheetApp.openByUrl(url);
  const sheets = ss.getSheets();
  if (!sheets.length) throw new Error('No tabs found: ' + url);
  return sheets[0];
}

function mapSourceHeaders_(headerRow, cfg) {
  const lower = headerRow.map(normalizeImportHeader_);
  return {
    name: findImportHeader_(lower, cfg.nameAliases),
    phone: findImportHeader_(lower, cfg.phoneAliases),
    campaign: findImportHeader_(lower, cfg.campaignAliases),
    date: findImportHeader_(lower, cfg.dateAliases),
    caller: findImportHeader_(lower, cfg.callerAliases),
    status: findImportHeader_(lower, cfg.statusAliases),
    stage: findImportHeader_(lower, cfg.stageAliases),
    coupon: findImportHeader_(lower, cfg.couponAliases),
    remarks: findImportHeader_(lower, cfg.remarksAliases),
    hospital: findImportHeader_(lower, cfg.hospitalAliases)
  };
}

function findImportHeader_(headers, aliases) {
  const wanted = aliases.map(normalizeImportHeader_);
  for (const x of wanted) {
    const i = headers.indexOf(x);
    if (i >= 0) return i;
  }
  return -1;
}

function normalizeImportHeader_(v) {
  return String(v || '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[_-]+/g, ' ');
}

function normalizeImportPhone_(v) {
  let d = String(v == null ? '' : v).replace(/[^0-9]/g, '');
  if (!d) return '';
  if (d.length > 10) d = d.slice(-10);
  return d.length === 10 ? d : '';
}

function getCell_(row, idx) {
  return idx >= 0 ? row[idx] : '';
}

function getCellText_(row, idx) {
  return idx >= 0 ? String(row[idx] == null ? '' : row[idx]).trim() : '';
}

function toIsoDate_(v) {
  if (v == null || v === '') return null;
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function toIsoDateTime_(v) {
  if (v == null || v === '') return null;
  const d = Object.prototype.toString.call(v) === '[object Date]' ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function validateImportConfig_() {
  if (!IMPORT_CONFIG_.edgeFunctionUrl) throw new Error('Missing Script Property: EDGE_FUNCTION_URL');
  if (!IMPORT_CONFIG_.token) throw new Error('Missing Script Property: CRM_SYNC_TOKEN');
}
