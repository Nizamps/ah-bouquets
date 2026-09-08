/**
 * OPD CRM - HISTORICAL BACKFILL DRY RUN
 *
 * IMPORTANT:
 * - This file is for DRY RUN only. It does NOT write to Supabase.
 * - Keep your existing live-sync Code.gs unchanged.
 * - Run dryRunHistoricalBackfill() from Apps Script.
 *
 * The script reads the 6 existing Google Sheets and reports:
 * - rows
 * - valid lead rows
 * - missing phone
 * - missing name
 * - duplicate phone rows inside the same source
 * - campaigns found
 * - caller names found
 * - Core OPD rows and phone matches across the 5 lead sheets
 *
 * It uses the exact sheet URLs supplied for this migration.
 */

const BACKFILL_SHEETS_ = {
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
    remarksAliases: ['comments', 'remarks', 'comment']
  },
  meta_ads: {
    label: 'Meta Ads',
    url: 'https://docs.google.com/spreadsheets/d/1TFkUgh00gXz5EQk-DTg7xeJ84aT3wk61d2jh20R2rYw/edit?gid=0#gid=0',
    nameAliases: ['full_name', 'full name', 'patient name', 'name'],
    phoneAliases: ['phone', 'phone number', 'mobile', 'mobile number', 'whatsapp number', 'whatsapp_number', 'contact'],
    campaignAliases: ['campaign_name', 'campaign name', 'campaign', 'camp name'],
    dateAliases: ['calling date', 'campaign date', 'date'],
    callerAliases: ['caller', 'caller name', 'caller_name'],
    statusAliases: ['status', 'calling status'],
    stageAliases: ['stage', 'opd status'],
    couponAliases: ['coupon code', 'discount code', 'discount'],
    remarksAliases: ['comments', 'remarks', 'comment']
  },
  rcs: {
    label: 'RCS',
    url: 'https://docs.google.com/spreadsheets/d/14j6UHxUvzo7T2u1yMnoY3JFtvDGwDGHjVbzFPiUDwCI/edit?gid=0#gid=0',
    nameAliases: ['full_name', 'full name', 'patient name', 'name', 'customer name'],
    phoneAliases: ['phonenumber', 'phone number', 'number', 'phone', 'mobile', 'mobile number'],
    campaignAliases: ['camp name', 'campaign name', 'campaign', 'campaign_name'],
    dateAliases: ['calling date', 'date', 'campaign date'],
    callerAliases: ['caller name', 'caller', 'caller_name'],
    statusAliases: ['status', 'calling status'],
    stageAliases: ['stage', 'opd status'],
    couponAliases: ['coupon code', 'discount code', 'discount'],
    remarksAliases: ['comments', 'remarks', 'comment']
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
    remarksAliases: ['comments', 'remarks', 'comment']
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
    remarksAliases: ['comments', 'remarks', 'comment']
  }
};

const CORE_OPD_ = {
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

function dryRunHistoricalBackfill() {
  const report = {
    started_at: new Date().toISOString(),
    sources: [],
    core_opd: null
  };

  const allLeadPhones = {};
  const allLeadPhoneRows = {};

  Object.keys(BACKFILL_SHEETS_).forEach(key => {
    const cfg = BACKFILL_SHEETS_[key];
    const result = inspectBackfillSheet_(cfg);

    result.key = key;
    report.sources.push(result);

    result.phoneSet.forEach(phone => {
      if (!allLeadPhones[phone]) allLeadPhones[phone] = [];
      allLeadPhones[phone].push(cfg.label);
    });

    result.phoneRows.forEach(item => {
      if (!allLeadPhoneRows[item.phone]) allLeadPhoneRows[item.phone] = [];
      allLeadPhoneRows[item.phone].push(cfg.label + ' row ' + item.row);
    });

    delete result.phoneSet;
    delete result.phoneRows;
  });

  report.core_opd = inspectCoreOpd_(CORE_OPD_, allLeadPhones, allLeadPhoneRows);
  report.finished_at = new Date().toISOString();

  Logger.log('========== OPD CRM HISTORICAL BACKFILL DRY RUN ==========');
  report.sources.forEach(r => {
    Logger.log(
      '%s | rows=%s | valid=%s | missing_phone=%s | missing_name=%s | duplicate_phone_rows=%s | campaigns=%s | callers=%s',
      r.label,
      r.rows,
      r.valid,
      r.missing_phone,
      r.missing_name,
      r.duplicate_phone_rows,
      r.campaigns.join(' | ') || '-',
      r.callers.join(' | ') || '-'
    );
  });

  Logger.log(
    'CORE OPD | rows=%s | valid_phone=%s | matched_to_any_lead_source=%s | unmatched=%s | duplicate_phone_rows=%s',
    report.core_opd.rows,
    report.core_opd.valid_phone,
    report.core_opd.matched,
    report.core_opd.unmatched,
    report.core_opd.duplicate_phone_rows
  );

  Logger.log('Full report JSON: ' + JSON.stringify(report, null, 2));

  return report;
}

function inspectBackfillSheet_(cfg) {
  const sh = openFirstTab_(cfg.url);
  const values = sh.getDataRange().getValues();

  const result = {
    label: cfg.label,
    rows: Math.max(0, values.length - 1),
    valid: 0,
    missing_phone: 0,
    missing_name: 0,
    duplicate_phone_rows: 0,
    campaigns: [],
    callers: [],
    phoneSet: [],
    phoneRows: [],
    header_map: {}
  };

  if (values.length < 1) return result;

  const headers = values[0].map(v => String(v || '').trim());
  const lower = headers.map(normalizeHeader_);

  const idx = {
    name: findAnyHeader_(lower, cfg.nameAliases),
    phone: findAnyHeader_(lower, cfg.phoneAliases),
    campaign: findAnyHeader_(lower, cfg.campaignAliases),
    date: findAnyHeader_(lower, cfg.dateAliases),
    caller: findAnyHeader_(lower, cfg.callerAliases),
    status: findAnyHeader_(lower, cfg.statusAliases),
    stage: findAnyHeader_(lower, cfg.stageAliases),
    coupon: findAnyHeader_(lower, cfg.couponAliases),
    remarks: findAnyHeader_(lower, cfg.remarksAliases)
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
    remarks: idx.remarks >= 0 ? headers[idx.remarks] : null
  };

  if (idx.phone < 0) {
    throw new Error(cfg.label + ': phone column not found. Headers: ' + headers.join(' | '));
  }

  const phonesSeen = {};
  const campaigns = {};
  const callers = {};

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const name = idx.name >= 0 ? String(row[idx.name] || '').trim() : '';
    const phone = normalizePhone_(row[idx.phone]);

    if (!name) result.missing_name++;
    if (!phone) {
      result.missing_phone++;
      continue;
    }

    result.valid++;

    if (phonesSeen[phone]) {
      result.duplicate_phone_rows++;
    }
    phonesSeen[phone] = true;

    result.phoneSet.push(phone);
    result.phoneRows.push({phone: phone, row: r + 1});

    if (idx.campaign >= 0) {
      const campaign = String(row[idx.campaign] || '').trim();
      if (campaign) campaigns[campaign] = true;
    }

    if (idx.caller >= 0) {
      const caller = String(row[idx.caller] || '').trim();
      if (caller) callers[caller] = true;
    }
  }

  result.campaigns = Object.keys(campaigns);
  result.callers = Object.keys(callers);
  return result;
}

function inspectCoreOpd_(cfg, allLeadPhones, allLeadPhoneRows) {
  const sh = openFirstTab_(cfg.url);
  const values = sh.getDataRange().getValues();

  const result = {
    label: cfg.label,
    rows: Math.max(0, values.length - 1),
    valid_phone: 0,
    matched: 0,
    unmatched: 0,
    duplicate_phone_rows: 0,
    campaigns: [],
    callers: [],
    hospitals: [],
    unmatched_samples: []
  };

  if (values.length < 2) return result;

  const headers = values[0].map(v => String(v || '').trim());
  const lower = headers.map(normalizeHeader_);

  const idx = {
    name: findAnyHeader_(lower, cfg.nameAliases),
    phone: findAnyHeader_(lower, cfg.phoneAliases),
    campaign: findAnyHeader_(lower, cfg.campaignAliases),
    caller: findAnyHeader_(lower, cfg.callerAliases),
    hospital: findAnyHeader_(lower, cfg.hospitalAliases),
    doctor: findAnyHeader_(lower, cfg.doctorAliases),
    department: findAnyHeader_(lower, cfg.departmentAliases),
    visit: findAnyHeader_(lower, cfg.visitAliases),
    date: findAnyHeader_(lower, cfg.dateAliases)
  };

  if (idx.phone < 0) {
    throw new Error('Core OPD: phone column not found. Headers: ' + headers.join(' | '));
  }

  const seen = {};
  const campaigns = {};
  const callers = {};
  const hospitals = {};

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const phone = normalizePhone_(row[idx.phone]);

    if (!phone) continue;
    result.valid_phone++;

    if (seen[phone]) result.duplicate_phone_rows++;
    seen[phone] = true;

    if (idx.campaign >= 0) {
      const x = String(row[idx.campaign] || '').trim();
      if (x) campaigns[x] = true;
    }
    if (idx.caller >= 0) {
      const x = String(row[idx.caller] || '').trim();
      if (x) callers[x] = true;
    }
    if (idx.hospital >= 0) {
      const x = String(row[idx.hospital] || '').trim();
      if (x) hospitals[x] = true;
    }

    if (allLeadPhones[phone]) {
      result.matched++;
    } else {
      result.unmatched++;
      if (result.unmatched_samples.length < 20) {
        result.unmatched_samples.push({
          row: r + 1,
          patient_name: idx.name >= 0 ? String(row[idx.name] || '').trim() : '',
          phone: phone
        });
      }
    }
  }

  result.campaigns = Object.keys(campaigns);
  result.callers = Object.keys(callers);
  result.hospitals = Object.keys(hospitals);
  return result;
}

function openFirstTab_(url) {
  const ss = SpreadsheetApp.openByUrl(url);
  const sheets = ss.getSheets();
  if (!sheets.length) throw new Error('No tabs found: ' + url);
  return sheets[0];
}

function findAnyHeader_(headers, aliases) {
  const wanted = aliases.map(normalizeHeader_);
  for (let i = 0; i < wanted.length; i++) {
    const pos = headers.indexOf(wanted[i]);
    if (pos >= 0) return pos;
  }
  return -1;
}

function normalizeHeader_(v) {
  return String(v || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[_-]+/g, ' ');
}

function normalizePhone_(v) {
  let d = String(v == null ? '' : v).replace(/[^0-9]/g, '');
  if (!d) return '';
  if (d.length > 10) d = d.slice(-10);
  return d.length === 10 ? d : '';
}
