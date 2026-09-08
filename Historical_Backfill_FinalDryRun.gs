/**
 * OPD CRM - HISTORICAL BACKFILL FINAL DRY RUN
 *
 * SAFE: This version READS Google Sheets only.
 * It DOES NOT insert/update/delete Supabase data.
 *
 * It improves the first dry run by calculating:
 * 1) valid lead rows from all 5 lead-source sheets
 * 2) duplicate lead rows by PHONE + CAMPAIGN across all sources
 * 3) unique historical leads expected from the 5 source sheets
 * 4) Core OPD unique phones
 * 5) Core OPD phones already represented by a source lead
 * 6) Core OPD phones that would require a new historical lead
 * 7) Core OPD duplicate rows
 * 8) caller names found, so we can map them before import
 * 9) campaign names found
 *
 * IMPORTANT:
 * - Keep your existing live Code.gs unchanged.
 * - Run finalDryRunHistoricalBackfill().
 */

const FINAL_BACKFILL_SHEETS_ = {
  hospital_cta: {
    label: 'Hospital CTA',
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
  meta_ads: {
    label: 'Meta Ads',
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
  rcs: {
    label: 'RCS',
    url: 'https://docs.google.com/spreadsheets/d/14j6UHxUvzo7T2u1yMnoY3JFtvDGwDGHjVbzFPiUDwCI/edit?gid=0#gid=0',
    nameAliases: ['name', 'patient name', 'full name', 'full_name', 'customer name'],
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
  whatsapp_cta: {
    label: 'WhatsApp CTA',
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
  hospital_dump: {
    label: 'Hospital Dump',
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
};

const FINAL_CORE_OPD_ = {
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
};

function finalDryRunHistoricalBackfill() {
  const started = new Date();
  const report = {
    safe_mode: true,
    note: 'No Supabase writes are performed by this function.',
    sources: [],
    source_unique_lead_keys: 0,
    source_unique_phones: 0,
    source_duplicate_rows_by_phone_campaign: 0,
    core_opd: null,
    estimated_unique_leads_after_core_opd: 0,
    estimated_opd_booking_rows: 0,
    warnings: []
  };

  const leadKeys = {};
  const sourcePhones = {};
  const callerNames = {};
  const campaignNames = {};

  Object.keys(FINAL_BACKFILL_SHEETS_).forEach(key => {
    const cfg = FINAL_BACKFILL_SHEETS_[key];
    const r = inspectFinalSource_(cfg);

    r.key = key;
    report.sources.push(r);

    r.leadKeys.forEach(k => {
      if (leadKeys[k]) {
        report.source_duplicate_rows_by_phone_campaign++;
      }
      leadKeys[k] = true;
    });

    r.phones.forEach(p => sourcePhones[p] = true);
    r.callers.forEach(n => callerNames[n] = true);
    r.campaigns.forEach(n => campaignNames[n] = true);

    delete r.leadKeys;
    delete r.phones;
    delete r.callers;
    delete r.campaigns;
  });

  report.source_unique_lead_keys = Object.keys(leadKeys).length;
  report.source_unique_phones = Object.keys(sourcePhones).length;

  const core = inspectFinalCore_(FINAL_CORE_OPD_, sourcePhones);
  report.core_opd = core;
  report.estimated_opd_booking_rows = core.valid_phone_rows;

  // Every source lead key becomes one lead. A Core OPD phone not represented
  // by any source phone becomes one additional historical lead.
  report.estimated_unique_leads_after_core_opd =
    report.source_unique_lead_keys + core.unmatched_unique_phones;

  report.unique_caller_names = Object.keys(callerNames).sort();
  report.unique_campaign_names = Object.keys(campaignNames).sort();

  report.finished_at = new Date().toISOString();

  Logger.log('========== FINAL HISTORICAL BACKFILL DRY RUN ==========');
  Logger.log('SAFE MODE: NO SUPABASE WRITES');
  Logger.log('Estimated unique source leads: %s', report.source_unique_lead_keys);
  Logger.log('Source duplicate rows by phone+campaign: %s', report.source_duplicate_rows_by_phone_campaign);
  Logger.log('Unique source phones: %s', report.source_unique_phones);
  Logger.log('Estimated additional leads from unmatched Core OPD phones: %s', core.unmatched_unique_phones);
  Logger.log('ESTIMATED TOTAL UNIQUE LEADS TO CREATE: %s', report.estimated_unique_leads_after_core_opd);
  Logger.log('CORE OPD valid phone rows / booking rows: %s', report.estimated_opd_booking_rows);
  Logger.log('CORE OPD unique phones: %s', core.unique_phones);
  Logger.log('CORE OPD phones matched to source leads: %s', core.matched_unique_phones);
  Logger.log('CORE OPD phones NOT matched to source leads: %s', core.unmatched_unique_phones);
  Logger.log('CORE OPD duplicate rows by phone: %s', core.duplicate_phone_rows);
  Logger.log('CALLERS FOUND: %s', report.unique_caller_names.join(' | ') || '-');
  Logger.log('CAMPAIGNS FOUND: %s', report.unique_campaign_names.join(' | ') || '-');

  report.sources.forEach(r => {
    Logger.log(
      '%s | rows=%s | valid=%s | missing_phone=%s | missing_name=%s | duplicate_phone_campaign_rows=%s | campaigns=%s | callers=%s',
      r.label, r.rows, r.valid, r.missing_phone, r.missing_name,
      r.duplicate_phone_campaign_rows,
      r.campaigns_text || '-',
      r.callers_text || '-'
    );
  });

  Logger.log('CORE OPD | rows=%s | valid_phone_rows=%s | unique_phones=%s | matched_unique_phones=%s | unmatched_unique_phones=%s | duplicate_phone_rows=%s',
    core.rows, core.valid_phone_rows, core.unique_phones,
    core.matched_unique_phones, core.unmatched_unique_phones,
    core.duplicate_phone_rows);

  if (core.unmatched_samples.length) {
    Logger.log('CORE OPD UNMATCHED SAMPLE (max 20): ' + JSON.stringify(core.unmatched_samples));
  }

  Logger.log('Full report JSON: ' + JSON.stringify(report, null, 2));
  return report;
}

function inspectFinalSource_(cfg) {
  const sh = openFinalFirstTab_(cfg.url);
  const values = sh.getDataRange().getValues();
  const result = {
    label: cfg.label,
    rows: Math.max(0, values.length - 1),
    valid: 0,
    missing_phone: 0,
    missing_name: 0,
    duplicate_phone_campaign_rows: 0,
    campaigns: [],
    callers: [],
    campaigns_text: '',
    callers_text: '',
    leadKeys: [],
    phones: [],
    header_map: {}
  };

  if (values.length < 1) return result;

  const headers = values[0].map(v => String(v || '').trim());
  const lower = headers.map(normalizeFinalHeader_);

  const idx = {
    name: findFinalHeader_(lower, cfg.nameAliases),
    phone: findFinalHeader_(lower, cfg.phoneAliases),
    campaign: findFinalHeader_(lower, cfg.campaignAliases),
    date: findFinalHeader_(lower, cfg.dateAliases),
    caller: findFinalHeader_(lower, cfg.callerAliases),
    status: findFinalHeader_(lower, cfg.statusAliases),
    stage: findFinalHeader_(lower, cfg.stageAliases),
    coupon: findFinalHeader_(lower, cfg.couponAliases),
    remarks: findFinalHeader_(lower, cfg.remarksAliases),
    hospital: findFinalHeader_(lower, cfg.hospitalAliases)
  };

  result.header_map = {
    name: idx.name >= 0 ? headers[idx.name] : null,
    phone: idx.phone >= 0 ? headers[idx.phone] : null,
    campaign: idx.campaign >= 0 ? headers[idx.campaign] : null,
    date: idx.date >= 0 ? headers[idx.date] : null,
    caller: idx.caller >= 0 ? headers[idx.caller] : null,
    status: idx.status >= 0 ? headers[idx.status] : null,
    stage: idx.stage >= 0 ? headers[idx.stage] : null,
    coupon: idx.coupon >= 0 ? headers[idx.coupon] : null,
    remarks: idx.remarks >= 0 ? headers[idx.remarks] : null,
    hospital: idx.hospital >= 0 ? headers[idx.hospital] : null
  };

  if (idx.phone < 0) {
    throw new Error(cfg.label + ': phone column not found. Headers: ' + headers.join(' | '));
  }

  const keySeen = {};
  const campaigns = {};
  const callers = {};

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const name = idx.name >= 0 ? String(row[idx.name] || '').trim() : '';
    const phone = normalizeFinalPhone_(row[idx.phone]);

    if (!name) result.missing_name++;
    if (!phone) {
      result.missing_phone++;
      continue;
    }

    result.valid++;
    result.phones.push(phone);

    const campaign = idx.campaign >= 0 ? String(row[idx.campaign] || '').trim() : '';
    const campaignKey = campaign ? normalizeFinalText_(campaign) : '__NO_CAMPAIGN__';
    const leadKey = phone + '|' + campaignKey;

    if (keySeen[leadKey]) result.duplicate_phone_campaign_rows++;
    keySeen[leadKey] = true;
    result.leadKeys.push(leadKey);

    if (campaign) campaigns[campaign] = true;

    if (idx.caller >= 0) {
      const caller = String(row[idx.caller] || '').trim();
      if (caller) callers[caller] = true;
    }
  }

  result.campaigns = Object.keys(campaigns).sort();
  result.callers = Object.keys(callers).sort();
  result.campaigns_text = result.campaigns.join(' | ');
  result.callers_text = result.callers.join(' | ');
  return result;
}

function inspectFinalCore_(cfg, sourcePhones) {
  const sh = openFinalFirstTab_(cfg.url);
  const values = sh.getDataRange().getValues();

  const result = {
    label: cfg.label,
    rows: Math.max(0, values.length - 1),
    valid_phone_rows: 0,
    unique_phones: 0,
    matched_unique_phones: 0,
    unmatched_unique_phones: 0,
    duplicate_phone_rows: 0,
    unmatched_samples: []
  };

  if (values.length < 2) return result;

  const headers = values[0].map(v => String(v || '').trim());
  const lower = headers.map(normalizeFinalHeader_);
  const idxPhone = findFinalHeader_(lower, cfg.phoneAliases);
  const idxName = findFinalHeader_(lower, cfg.nameAliases);

  if (idxPhone < 0) {
    throw new Error('Core OPD: phone column not found. Headers: ' + headers.join(' | '));
  }

  const seen = {};
  const unmatchedSeen = {};

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const phone = normalizeFinalPhone_(row[idxPhone]);
    if (!phone) continue;

    result.valid_phone_rows++;

    if (seen[phone]) {
      result.duplicate_phone_rows++;
    } else {
      seen[phone] = true;
      result.unique_phones++;

      if (sourcePhones[phone]) {
        result.matched_unique_phones++;
      } else {
        result.unmatched_unique_phones++;
        unmatchedSeen[phone] = true;
        if (result.unmatched_samples.length < 20) {
          result.unmatched_samples.push({
            row: r + 1,
            patient_name: idxName >= 0 ? String(row[idxName] || '').trim() : '',
            phone: phone
          });
        }
      }
    }
  }

  return result;
}

function openFinalFirstTab_(url) {
  const ss = SpreadsheetApp.openByUrl(url);
  const sheets = ss.getSheets();
  if (!sheets.length) throw new Error('No tabs found: ' + url);
  return sheets[0];
}

function findFinalHeader_(headers, aliases) {
  const wanted = aliases.map(normalizeFinalHeader_);
  for (let i = 0; i < wanted.length; i++) {
    const pos = headers.indexOf(wanted[i]);
    if (pos >= 0) return pos;
  }
  return -1;
}

function normalizeFinalHeader_(v) {
  return String(v || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[_-]+/g, ' ');
}

function normalizeFinalText_(v) {
  return String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeFinalPhone_(v) {
  let d = String(v == null ? '' : v).replace(/[^0-9]/g, '');
  if (!d) return '';
  if (d.length > 10) d = d.slice(-10);
  return d.length === 10 ? d : '';
}
