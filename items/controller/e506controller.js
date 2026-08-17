const { BmaReport,D506ToEpiNet } = require('../database/e506connection')
const time = require('./../../time.json')
const { Op } = require('sequelize')
const fs = require('fs').promises
const path = require('path')
const moment = require('moment')
const { cleansingDataD506 } = require('./d506controller')
const { data } = require('../database/d506connection')

const e506DataTransferToJson = async e506 => {
  try {
    const unixTime = moment.utc().unix()
    const whereCondition = {
      [Op.and]: [
        { [Op.or]: [{ state: { [Op.in]: [0, 1, 90] } }, { t_ransfer: 1 }] },
        { state: { [Op.ne]: 100 } },
        {
          [Op.or]: [
            {
              imported: {
                [Op.and]: [{ [Op.lte]: unixTime }, { [Op.gt]: time.time }]
              }
            },
            {
              updated: {
                [Op.and]: [{ [Op.lte]: unixTime }, { [Op.gt]: time.time }]
              }
            },
            {
              added: {
                [Op.and]: [{ [Op.lte]: unixTime }, { [Op.gt]: time.time }]
              }
            },
            // {
            //   add_name: "epinet-lotusnote"
            // }
          ]
        }
      ]
    }
    const Data = await BmaReport.count({
      where: whereCondition
    })
    const datalimit = Math.ceil(Data / 2500)
    for (let index = 0; index < datalimit; index++) {
      const findData = await BmaReport.findAll({
        where: whereCondition,
        attributes: [
          ['uuid', 'epidem_report_guid'],

          ['citizen_id', 'cid'],
          ['patient_found', 'treated_date'],
          ['patient_found', 'diagnosis_date'],
          ['passport_id', 'passport_no'],
          ['titlename', 'prefix'],
          ['firstname', 'first_name'],
          ['lastname', 'last_name'],
          ['nationality_code', 'nationality'],
          ['gender', 'gender'],
          ['birthdate', 'birth_date'],
          ['age_year', 'age_y'],
          ['age_month', 'age_m'],
          ['age_day', 'age_d'],
          ['married_status', 'marital_status_id'],
          ['address_no', 'address'],
          ['moo', 'moo'],
          ['road', 'road'],
          ['remark', 'comment'],
          ['lab_case', 'lap_his_name'],
          ['subdistrict_code', 'subdistrict_code'],
          ['contact_mobile', 'mobile_phone'],
          ['work_code', 'occupation'],
          ['disease_code', 'epidem_report_group_code'],
          ['cure_loc_code', 'treated_hospital_code'],
          ['case_date', 'report_datetime'],
          ['patient_sick', 'onset_date'],
          ['patient_death', 'death_date'],
          ['report_name', 'informer_name'],
          ['icd_10', 'diagnosis_icd10'],
          ['patient_status', 'epidem_person_status_id'],
          ['lab_method', 'vaccinated_status'],
          ['address_no', 'epidem_address'],
          // ['moo', 'epidem_moo'],
          ['add_name', 'add_name'],
          ['road', 'epidem_road'],
          ['patient_type', 'patient_type'],
          ['lab_method', 'epidem_lab_confirm_type_id'],
          ['lab_result', 'lab_report_result'],
          ['report_loc_code', 'role_update_hosp'],
          ['state', 'state'],
          ['rec_status', 'rec_status'],
          ['added', 'added'],
          ['imported', 'imported'],
          ['updated', 'updated'],
          ['icd_10', 'diagnosis_icd10_list'],
          ['id', 'id']
        ],
        order: [['id', 'ASC']],
        offset: index * 2500,
        limit: 2500,
        raw: true
      })

      findData.forEach(row => {
      if (row.passport_no && row.passport_no.length > 17) {
          row.passport_no = null
         }
      })

      const dumpFilePath = path.resolve(__dirname, '../../DumpFile/data_' + (index + 1) + '.json')

      const jsonData = JSON.stringify(findData, null, 4)
      await fs.writeFile(dumpFilePath, jsonData, 'utf8')
      console.log('JSON file has been saved.')
    }
    await BmaReport.update({ t_ransfer: 1 }, { where: whereCondition, transaction: e506 })
    return {}
  } catch (error) {
    throw error
  }
}

const insertD506ToE506 = async e506 => {
  try {
    const files = await fs.readdir('./D506File')
    console.log('Total files:', files.length)

    for (let index = 0; index < files.length; index++) {
      const filePath = `./D506File/data_${index + 1}.json`
      console.log(filePath)
      const dataFromFile = await fs.readFile(filePath, 'utf8')
      const { data: cleansingData } = await cleansingDataD506(JSON.parse(dataFromFile))
      const dumpFilePath = path.resolve(__dirname, '../../Check/data_' + '.json')

      const jsonData = JSON.stringify(cleansingData, null, 4)
      await fs.writeFile(dumpFilePath, jsonData, 'utf8')
      console.log('JSON file has been saved.')
      // ข้ามเคสที่มี UUID อยู่แล้วใน EPINET เพื่อไม่ให้ทับข้อมูลเดิม
      const allUuid = cleansingData.map(v => v.uuid).filter(Boolean)
      const existing = allUuid.length
        ? await BmaReport.findAll({ where: { uuid: { [Op.in]: allUuid } }, attributes: ['uuid'], raw: true })
        : []
      const existingSet = new Set(existing.map(v => v.uuid))
      const newRows = cleansingData.filter(v => !existingSet.has(v.uuid))

      if (newRows.length === 0) {
        console.log(`Skip file ${index + 1}: all ${cleansingData.length} records already exist in BmaReport`)
        continue
      }

      await BmaReport.bulkCreate(newRows, {
        transaction: e506,
        updateOnDuplicate: ["state", 'patient_sick', 'patient_found', "patient_death", "patient_status", "address_no", "moo", "disease", "address_soi", "road", "subdistrict", "district", "province", "postcode", "subdistrict_code", "urban", "disease_code", 'icd_10', 'lab_method', 'lab_result', "updated"],
      })

      const d506ToEpiData = newRows.map(v => {
        return {
          UUID: v.uuid, 
          resources: `D506 To EpiNet`}
      })

      if (d506ToEpiData.length > 0) {
          await D506ToEpiNet.bulkCreate(d506ToEpiData, {
            transaction: e506,
            updateOnDuplicate: ['resources'] 
          })
        }
    }
    return {}
  } catch (error) {
    throw error
  }
}

module.exports = { e506DataTransferToJson, insertD506ToE506 }
