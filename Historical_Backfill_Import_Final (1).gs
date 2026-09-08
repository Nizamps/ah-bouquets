/**
 * OPD CRM - HISTORICAL BACKFILL IMPORT (CORRECTED)
 *
 * REAL IMPORT. Writes through the opd-sheet-sync Edge Function.
 *
 * Required Script Properties:
 *   EDGE_FUNCTION_URL
 *   CRM_SYNC_TOKEN
 *
 * Caller mapping:
 *   Deepam   -> Ranajit
 *   Vrushabh -> Shawn
 *   Nizam    -> Nizam
 *   Ranajith -> Ranajit
 *   Ranajit  -> Ranajit
 *   Shawn    -> Shawn
 *
 * IMPORTANT:
 * - This file does NOT replace Code.gs.
 * - Test first with runHistoricalBackfillTest().
 * - Then run runHistoricalBackfill() for the full migration.
 * - Same phone + same campaign = duplicate.
 * - Same phone + different campaign = separate historical lead.
 */

const IMPORT_CONFIG_ = {
  edgeFunctionUrl: PropertiesService.getScriptProperties().getProperty('EDGE_FUNCTION_URL'),
  token: PropertiesService.getScriptProperties().getProperty('CRM_SYNC_TOKEN'),
  batchSize: 10,

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
      key: 'hospital_cta', label: 'Hospital CTA', sourceName: 'Hospital CTA',
      url: 'https://docs.google.com/spreadsheets/d/1IWgFBRPduP4dCG0kQzajyH9pLS2OQR1kI4XRkkfNNW0/edit?gid=0#gid=0',
      nameAliases: ['patient name', 'name', 'full name', 'full_name'],
      phoneAliases: ['phone number', 'phone', 'mobile number', 'mobile', 'contact number', 'contact'],
      campaignAliases: ['campaign name', 'campaign', 'camp name'],
      dateAliases: ['campaign date', 'date', 'calling date'],
      callerAliases: ['caller name', 'caller', 'caller_name'],
      statusAliases: ['status', 'calling status'],
      stageAliases: ['stage', 'opd status'],
      couponAliases: ['coupon code', 'discount code', 'discount'],
      remarksAliases: ['comments', 'remarks', 'comment'],
      hospitalAliases: ['hospital', 'hospital name']
    },
    {
      key: 'meta_ads', label: 'Meta Ads', sourceName: 'Meta Leads',
      url: 'https://docs.google.com/spreadsheets/d/1TFkUgh00gXz5EQk-DTg7xeJ84aT3wk61d2jh20R2rYw/edit?gid=0#gid=0',
      nameAliases: ['full_name', 'full name', 'patient name', 'name'],
      phoneAliases: ['whatsapp_number', 'whatsapp number', 'phone', 'phone number', 'mobile', 'mobile number', 'contact'],
      campaignAliases: ['campaign_name', 'campaign name', 'campaign', 'camp name'],
      dateAliases: ['calling date', 'campaign date', 'date'],
      callerAliases: ['caller name', 'caller', 'caller_name'],
      statusAliases: ['status', 'calling status'],
      stageAliases: ['stage', 'opd status'],
      couponAliases: ['coupon code', 'discount code', 'discount'],
      remarksAliases: ['comments', 'remarks', 'comment'],
      hospitalAliases: ['hospital', 'hospital name']
    },
    {
      key: 'rcs', label: 'RCS', sourceName: 'RCS',
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
      key: 'whatsapp_cta', label: 'WhatsApp CTA', sourceName: 'WhatsApp CTA',
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
      key: 'hospital_dump', label: 'Hospital Dump', sourceName: 'Hospital Dump',
      url: 'https://docs.google.com/spreadsheets/d/1j_FOCySHq-X7uvT2CzkKuCu3_zmAFrjWPMVfLqiO3SM/edit?gid=0#gid=0',
      nameAliases: ['patient name', 'name', 'full name', 'full_name'],
      phoneAliases: ['mobile number', 'phone number', 'phone', 'mobile', 'contact number'],
      campaignAliases: ['camp name', 'campaign name', 'campaign', 'campaign_name'],
      dateAliases: ['calling date', 'campaign date', 'visit date', 'date'],
      callerAliases: ['caller name', 'caller', 'caller_name'],
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
    callerAliases: ['caller name', 'caller', 'caller_name'],
    statusAliases: ['status', 'calling status'],
    stageAliases: ['stage', 'opd status'],
    couponAliases: ['coupon code', 'discount code', 'discount'],
    remarksAliases: ['comments', 'remarks', 'comment'],
    hospitalAliases: ['hospital', 'hospital name'],
    sourceAliases: ['source', 'lead source'],
    doctorAliases: ['doctor', 'doctor name'],
    departmentAliases: ['department', 'dept'],
    visitAliases: ['visit']
  }
};

/** Controlled test: one valid row from each source + one Core OPD row. */
function runHistoricalBackfillTest() {
  validateImportConfig_();
  const out = {sources: {}, core_opd: null};

  IMPORT_CONFIG_.sources.forEach(cfg => {
    const records = readSourceRecords_(cfg);
    const one = records.find(x => x.phone && x.campaign_name);
    if (!one) {
      out.sources[cfg.label] = {skipped: true, reason: 'No valid row with phone + campaign'};
      return;
    }
    const r = callEdge_('backfill_lead_batch', [one]);
    out.sources[cfg.label] = r.result || r;
  });

  const coreRecords = readCoreOpdRecords_(IMPORT_CONFIG_.coreOpd);
  const sourcePhoneSet = {};
  Object.keys(out.sources).forEach(k => {});
  IMPORT_CONFIG_.sources.forEach(cfg => {
    readSourceRecords_(cfg).forEach(x => { if (x.phone) sourcePhoneSet[normalizeImportPhone_(x.phone)] = true; });
  });
  const oneCore = coreRecords.find(x => x.phone && sourcePhoneSet[normalizeImportPhone_(x.phone)]);
  if (oneCore) {
    const r = callEdge_('backfill_core_opd_batch', [oneCore]);
    out.core_opd = r.result || r;
  } else {
    out.core_opd = {skipped: true, reason: 'No Core OPD row matched a source-lead phone in test selection'};
  }

  Logger.log('========== CONTROLLED HISTORICAL BACKFILL TEST ==========' );
  Logger.log(JSON.stringify(out, null, 2));
  return out;
}

/** Full historical import after the controlled test succeeds. */
function runHistoricalBackfill() {
  validateImportConfig_();
  const totals = {
    sources: {},
    core_opd: {},
    total_inserted: 0,
    total_duplicates: 0,
    total_skipped: 0,
    total_errors: 0
  };

  IMPORT_CONFIG_.sources.forEach(cfg => {
    const records = readSourceRecords_(cfg);
    const r = sendBatches_(records, 'backfill_lead_batch');
    totals.sources[cfg.label] = r;
    totals.total_inserted += r.inserted || 0;
    totals.total_duplicates += r.duplicates || 0;
    totals.total_skipped += r.skipped || 0;
    totals.total_errors += r.errors || 0;
  });

  const coreRecords = readCoreOpdRecords_(IMPORT_CONFIG_.coreOpd);
  const cr = sendBatches_(coreRecords, 'backfill_core_opd_batch');
  totals.core_opd = cr;
  totals.total_inserted += cr.leads_created || 0;
  totals.total_duplicates += cr.duplicates || 0;
  totals.total_skipped += cr.skipped || 0;
  totals.total_errors += cr.errors || 0;

  Logger.log('========== HISTORICAL BACKFILL COMPLETE ==========' );
  Logger.log(JSON.stringify(totals, null, 2));
  return totals;
}

function readSourceRecords_(cfg) {
  const sh = openImportSheet_(cfg.url);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const idx = mapHeaders_(values[0], cfg);
  if (idx.phone < 0) throw new Error(cfg.label + ': phone column not found.');

  const records = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const phone = normalizeImportPhone_(cell_(row, idx.phone));
    if (!phone) continue;
    const campaign = text_(row, idx.campaign);
    records.push({
      source_name: cfg.sourceName,
      source_row_key: `historical:${cfg.key}:row:${r + 1}`,
      patient_name: text_(row, idx.name) || 'Unknown Patient',
      phone: String(cell_(row, idx.phone) || '').trim(),
      campaign_name: campaign,
      campaign_date: toIsoDate_(cell_(row, idx.date)),
      caller_name: text_(row, idx.caller),
      calling_status: text_(row, idx.status),
      opd_status: text_(row, idx.stage),
      coupon_code: text_(row, idx.coupon),
      remarks: text_(row, idx.remarks),
      hospital: normalizeHospital_(text_(row, idx.hospital)),
      calling_date: toIsoDateTime_(cell_(row, idx.date)),
      follow_up_date: null,
      follow_up_time: null
    });
  }
  return records;
}

function readCoreOpdRecords_(cfg) {
  const sh = openImportSheet_(cfg.url);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const lower = values[0].map(normalizeImportHeader_);
  const idx = {
    name: findHeader_(lower, cfg.nameAliases), phone: findHeader_(lower, cfg.phoneAliases),
    campaign: findHeader_(lower, cfg.campaignAliases), date: findHeader_(lower, cfg.dateAliases),
    caller: findHeader_(lower, cfg.callerAliases), status: findHeader_(lower, cfg.statusAliases),
    stage: findHeader_(lower, cfg.stageAliases), coupon: findHeader_(lower, cfg.couponAliases),
    remarks: findHeader_(lower, cfg.remarksAliases), hospital: findHeader_(lower, cfg.hospitalAliases),
    doctor: findHeader_(lower, cfg.doctorAliases), department: findHeader_(lower, cfg.departmentAliases),
    visit: findHeader_(lower, cfg.visitAliases)
  };
  if (idx.phone < 0) throw new Error('Core OPD: phone column not found.');

  const records = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const phone = normalizeImportPhone_(cell_(row, idx.phone));
    if (!phone) continue;
    const bookingCell = idx.visit >= 0 && cell_(row, idx.visit) ? cell_(row, idx.visit) : cell_(row, idx.date);
    records.push({
      source_row_key: String(r + 1),
      source_name: idx.source >= 0 ? text_(row, idx.source) : '',
      patient_name: text_(row, idx.name) || 'Unknown Patient',
      phone: String(cell_(row, idx.phone) || '').trim(),
      campaign_name: text_(row, idx.campaign),
      campaign_date: toIsoDate_(cell_(row, idx.date)),
      caller_name: text_(row, idx.caller),
      calling_status: text_(row, idx.status),
      opd_status: text_(row, idx.stage),
      coupon_code: text_(row, idx.coupon),
      remarks: text_(row, idx.remarks),
      hospital: normalizeHospital_(text_(row, idx.hospital)),
      doctor_name: text_(row, idx.doctor),
      department: text_(row, idx.department),
      booking_date: toIsoDate_(bookingCell)
    });
  }
  return records;
}

function sendBatches_(records, action) {
  const totals = {inserted: 0, duplicates: 0, skipped: 0, errors: 0, matched: 0, booking_inserted: 0, leads_created: 0};
  for (let i = 0; i < records.length; i += IMPORT_CONFIG_.batchSize) {
    const batch = records.slice(i, i + IMPORT_CONFIG_.batchSize);
    const response = callEdge_(action, batch);
    if (!response.ok) throw new Error(action + ': ' + JSON.stringify(response));
    const r = response.result || {};
    Object.keys(totals).forEach(k => { if (typeof r[k] === 'number') totals[k] += r[k]; });
    Logger.log('%s: %s-%s/%s -> %s', action, i + 1, Math.min(i + batch.length, records.length), records.length, JSON.stringify(r));
  }
  return totals;
}

function callEdge_(action, records) {
  const res = UrlFetchApp.fetch(IMPORT_CONFIG_.edgeFunctionUrl, {
    method: 'post', contentType: 'application/json',
    headers: {'x-crm-token': IMPORT_CONFIG_.token},
    payload: JSON.stringify({action, records, caller_mapping: IMPORT_CONFIG_.callerMapping, include_details: true}),
    muteHttpExceptions: true
  });
  const code = res.getResponseCode(), body = res.getContentText();
  if (code < 200 || code >= 300) throw new Error('Edge Function ' + code + ': ' + body.slice(0, 2000));
  return JSON.parse(body);
}

function openImportSheet_(url) { return SpreadsheetApp.openByUrl(url).getSheets()[0]; }

function mapHeaders_(row, cfg) {
  const lower = row.map(normalizeImportHeader_);
  return {
    name: findHeader_(lower, cfg.nameAliases), phone: findHeader_(lower, cfg.phoneAliases),
    campaign: findHeader_(lower, cfg.campaignAliases), date: findHeader_(lower, cfg.dateAliases),
    caller: findHeader_(lower, cfg.callerAliases), status: findHeader_(lower, cfg.statusAliases),
    stage: findHeader_(lower, cfg.stageAliases), coupon: findHeader_(lower, cfg.couponAliases),
    remarks: findHeader_(lower, cfg.remarksAliases), hospital: findHeader_(lower, cfg.hospitalAliases)
  };
}

function findHeader_(headers, aliases) {
  const wanted = aliases.map(normalizeImportHeader_);
  for (const x of wanted) { const i = headers.indexOf(x); if (i >= 0) return i; }
  return -1;
}

function normalizeImportHeader_(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[_-]+/g, ' '); }
function normalizeImportPhone_(v) { let d = String(v == null ? '' : v).replace(/[^0-9]/g, ''); if (!d) return ''; if (d.length > 10) d = d.slice(-10); return d.length === 10 ? d : ''; }
function normalizeHospital_(v) { const x = String(v || '').trim().toLowerCase(); if (!x) return null; if (x.includes('altius')) return 'Altius'; if (x.includes('ehrc') || x.includes('ehbr')) return 'EHRC'; return null; }
function cell_(row, idx) { return idx >= 0 ? row[idx] : ''; }
function text_(row, idx) { return idx >= 0 ? String(row[idx] == null ? '' : row[idx]).trim() : ''; }
function toIsoDate_(v) { if (v == null || v === '') return null; if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd'); const s = String(v).trim(); if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; const d = new Date(s); return isNaN(d.getTime()) ? null : Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function toIsoDateTime_(v) { if (v == null || v === '') return null; const d = Object.prototype.toString.call(v) === '[object Date]' ? v : new Date(v); return isNaN(d.getTime()) ? null : d.toISOString(); }
function validateImportConfig_() { if (!IMPORT_CONFIG_.edgeFunctionUrl) throw new Error('Missing Script Property: EDGE_FUNCTION_URL'); if (!IMPORT_CONFIG_.token) throw new Error('Missing Script Property: CRM_SYNC_TOKEN'); }
