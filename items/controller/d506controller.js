const { GenerateCid, data } = require('../database/d506connection')
const { Op, Sequelize } = require('sequelize')
const moment = require('moment')
const path = require('path')
const fs = require('fs').promises
const disCD = require('./../seed/disCD.json')
const otpGenerator = require('otp-generator')
const { throwError } = require('../lib/winston')
const time = require('./../../time.json')
const cdDay = require('./../seed/CDcode.json')
const work = require('./../seed/jobcode.json').bma_data_occupation
const national = require('./../seed/nationalcode.json').bma_data_nationality
const hosp_code = require('./../seed/hospcode.json')
const { BmaReport, BmaDataDiseases, BmaDataPlaceRx, BmaDataThaiAddress,EpiNetToD506 } = require('../database/e506connection')
const { data: databaseD506 } = require('../database/d506connection')

// D506 status=5 diseases allowed to import one-way as EPI state=100
const STATUS5_WHITELIST = [
  '01', '19', '20', '23', '24', '25', '29', '35', '42', '43', '45', '46', '53', '65', '68', '75', '76', '78', '82', '83', '85', '91', '94', '95'
]

async function changeFieldFunction(data) {
  try {
    let cid_gen = []
    let delete_gen = []

    for (let index = 0; index < data.length; index++) {
      const element = data[index]

      // Strict validation: treated_hospital_code must be exactly 5 or 9 characters
      // antigravity: Added strict validation
      const codeLen = element.treated_hospital_code ? String(element.treated_hospital_code).length : 0
      if (codeLen !== 5 && codeLen !== 9) {
        console.warn(`Skipped validation: treated_hospital_code length ${codeLen} invalid (UUID: ${element.epidem_report_guid || 'N/A'})`)
        data.splice(index, 1)
        index--
        continue
      }

      const findHosp = await hosp_code.hospcode.find(v => element.treated_hospital_code == v.office_id)
      if (!findHosp) {
        data[index].isolate_chw_code = ''
      } else {
        data[index].isolate_chw_code = findHosp.changwatcode
      }

      const subdistrict = element.subdistrict_code
      if (subdistrict) {
        data[index].chw_code = subdistrict.slice(0, 2)
        data[index].amp_code = subdistrict.slice(2, 4)
        data[index].tmb_code = subdistrict.slice(4, 6)
      }
      // if (!findHosp) {
      //   data[index].chw_code = null
      //   data[index].amp_code = null
      //   data[index].tmb_code = null
      // } else {
      //   data[index].chw_code = findHosp.changwatcode
      //   data[index].amp_code = findHosp.ampurcode
      //   data[index].tmb_code = findHosp.tamboncode
      // }
      data[index].report_datetime = element.report_datetime == '0000-00-00' || element.report_datetime == null ? moment.unix(element.added).format('YYYY-MM-DD') : element.report_datetime
      const year = element.age_y.trim().replace(/-/g, '').slice(0, 3)
      const month = element.age_m.trim().replace(/-/g, '').slice(0, 2)
      const day = element.age_d.trim().replace(/-/g, '').slice(0, 2)
      data[index].age_d = element.age_d.trim().replace(/-/g, '')
      data[index].age_y = !year || year == 'NaN' ? 0 : year
      data[index].age_m = !month || month == 'Na' ? 0 : month
      data[index].age_d = !day || day == 'Na' ? 0 : day
      data[index].epidem_chw_code = data[index].chw_code
      data[index].epidem_amp_code = data[index].amp_code
      data[index].epidem_tmb_code = data[index].tmb_code
      data[index].address = element.address ? element.address : '-'
      data[index].birth_date =
        !element.birth_date || element.birth_date == '0000-00-00'
          ? moment(`${moment.utc().add(7, "hour").format('YYYY')}-01-01`)
            .subtract(year, 'year')
            .format('YYYY-MM-DD')
          : element.birth_date
      if (!element.occupation) {
        data[index].occupation = '9998'
      }
      data[index].birth_date = data[index].birth_date.replace("-00", "-01")
      data[index].birth_date = +data[index].birth_date.split("-")[0] > 2400 ? `${+data[index].birth_date.split("-")[0] - 543}-${data[index].birth_date.split('-')[1]}-${data[index].birth_date.split('-')[2]}` : data[index].birth_date
      data[index].death_date = element.death_date == '0000-00-00' ? null : element.death_date
      data[index].treated_date = element.treated_date == '0000-00-00' ? element.report_datetime : element.treated_date
      data[index].diagnosis_date = element.diagnosis_date == '0000-00-00' ? element.report_datetime : element.diagnosis_date
      data[index].onset_date = element.onset_date == '0000-00-00' ? element.report_datetime : element.onset_date
      data[index].municipal = 3
      data[index].epidem_report_guid = element.epidem_report_guid.length == 36 ? `{${element.epidem_report_guid}}` : element.epidem_report_guid
      const address = data[index].address ? data[index].address : ''
      const moo = data[index].moo ? data[index].moo : ''
      const addressCast = address ? `${address} ${moo}` : moo
      data[index].address = addressCast
      data[index].moo = null
      data[index].epidem_address = addressCast
      data[index].epidem_moo = null
      delete data[index].subdistrict_code
      data[index].gender = element.gender == 'ชาย' ? 1 : 2
      data[index].hospital_code = 12499
      data[index].epidem_person_status_id = element.epidem_person_status_id == 'หาย' ? 1 : element.epidem_person_status_id == 'ตาย' ? 2 : element.epidem_person_status_id == 'ยังรักษาอยู่' ? 3 : 4
      if (!element.cid && !element.passpost) {
        const findCid = await databaseD506.findOne({ where: { first_name: element.first_name, last_name: element.last_name }, attributes: ["cid"] })
        if (findCid) {
          element.cid = findCid.cid
        }
      }
      if (element.cid && +element.nationality == 99) {
        const CheckStatus = await checkMod11(element.cid, element.epidem_report_guid)
        if (!CheckStatus) {
          data[index].cid = null
        }
      }
      if (data[index].passport_no) {
        data[index].cid = data[index].passport_no
      } else if (!data[index].cid && (+element.nationality == 99 || !element.nationality)) {
        const OldCid = await GenerateCid.findOne({ where: { first_name: element.first_name, last_name: element.last_name, hosp_code: element.treated_hospital_code }, raw: true })
        if (!OldCid) {
          const genCID = otpGenerator.generate(11, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false
          })
          const gen_cid_mod11 = genMod11(`0${genCID}`)
          cid_gen.push({ cid: gen_cid_mod11, passport_no: null, id: data[index].epidem_report_guid, first_name: element.first_name, last_name: element.last_name })
          data[index].cid = gen_cid_mod11
        } else {
          data[index].cid = OldCid.cid
          data[index].passport_no = OldCid.passport
        }
      } else if (!data[index].passport_no && +element.nationality != 99) {
        const Oldpassport = await GenerateCid.findOne({ where: { first_name: element.first_name, last_name: element.last_name, hosp_code: element.treated_hospital_code }, raw: true })
        if (Oldpassport) {
          data[index].cid = OldCid.cid
          data[index].passport_no = OldCid.passport
        } else {
          const genPassport = otpGenerator.generate(10, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false
          })
          cid_gen.push({ cid: genPassport, passport_no: genPassport, id: data[index].epidem_report_guid, first_name: element.first_name, last_name: element.last_name })
          data[index].cid = genPassport
          data[index].passport_no = genPassport
        }
      } else {
        delete_gen.push({ id: data[index].epidem_report_guid })
      }

      data[index].epidem_symptom_type_id = 1
      data[index].respirator_status = 'N'
      data[index].patient_type = element.patient_type == 'ผู้ป่วยใน' ? 'IPD' : element.patient_type == 'ค้นพบในชุมชน' ? 'ACF' : 'OPD'
      // const vaccinated_status = element.vaccinated_status
      data[index].vaccinated_status = 'N'
      data[index].epidem_lab_confirm_type_id = element.epidem_lab_confirm_type_id == 'ATK' ? 2 : element.epidem_lab_confirm_type_id == 'RT-PCR' ? 1 : element.epidem_lab_confirm_type_id == 'Antibody' ? 3 : null
      switch (element.marital_status_id) {
        case 'โสด':
          data[index].marital_status_id = 1
          break
        case 'หม้าย':
          data[index].marital_status_id = 4
          break
        case 'หย่าร้าง':
          data[index].marital_status_id = 3
          break
        case 'คู่':
          data[index].marital_status_id = 2
          break
        case 'สมรส':
          data[index].marital_status_id = 2
          break
        default:
          data[index].marital_status_id = 5
          break
      }
      data[index].diagnosis_icd10 = data[index].diagnosis_icd10 ? data[index].diagnosis_icd10.replace('.', '') : null
      data[index].diagnosis_icd10_list = data[index].diagnosis_icd10 ? data[index].diagnosis_icd10.replace('.', '') : null
      data[index].role_update_hosp = null
      if (data[index].cid) {
        if (data[index].cid.length > 13) {
          // console.log(data[index].cid.length)
          const cleanCID = element.cid ? element.cid.replace(/[^\d]/g, '') : null
          data[index].cid = cleanCID
        }
      }
      // if (data[index].cid.length > 13) {
      // console.log(data[index].cid)
      // }
      data[index].is_epinet = 1
      data[index].update_datetime = moment.utc().add(7, "hour").format('YYYY-MM-DD HH:mm:ss')
      // data[index].tmlt_code = data[index].id <= 39571 ? 1 : null
      data[index].tmlt_code = data[index].add_name == "epinet-lotusnote" || data[index].id <= 39571 ? 1 : null
      data[index].t_ransfer = 1
      delete data[index].imported
      delete data[index].updated
      delete data[index].added
      delete data[index].id
    }
    return { data, cid_gen, delete_gen }
  } catch (error) {
    console.log(error)
    throw error
  }
}

async function checkMod11(cid, uuid) {
  const str = cid.toString().trim().replace('-', '')
  if (str.length != 13) {
    // console.error(uuid)
    return false
  }

  const number = str.slice(0, -1) // Exclude the last digit (check digit)
  const checkDigit = str.slice(-1) // Get the last digit (check digit)

  let startNumber = 13
  let results = 0

  for (let index = 0; index < number.length; index++) {
    const element = number[index]
    results += +element * startNumber
    startNumber -= 1
  }

  results = results % 11
  results = 11 - results

  if (results >= 10) {
    results = results % 10
  }

  const calculatedCheckDigit = results.toString()

  // console.log('Provided CID:', cid)
  // console.log('Calculated check digit:', calculatedCheckDigit)
  // console.log('Provided check digit:', checkDigit)

  return calculatedCheckDigit === checkDigit
}

const e506JsonTransferToD506 = async (d506, e506) => {
  try {
    const filelocate = `../../DumpFile`
    const filelocatePath = path.resolve(__dirname, filelocate)
    const files = await fs.readdir(filelocatePath)
    console.log('Total files:', files.length)
    for (let index = 0; index < files.length; index++) {
      const filePath = `../../DumpFile/data_${index + 1}.json`
      const dumpFilePath = path.resolve(__dirname, filePath)
      console.log(filePath)
      const dataFromFile = await fs.readFile(dumpFilePath, 'utf8')
      const { data: cleansingData, cid_gen: cid_gen, delete_gen: delete_gen } = await changeFieldFunction(JSON.parse(dataFromFile))
      // console.log({ gen: cid_gen.length })
      await GenerateCid.bulkCreate(cid_gen, {
        transaction: d506,
        updateOnDuplicate: ['cid', 'passport_no']
      })
      await GenerateCid.destroy({
        where: { [Op.or]: delete_gen },
        transaction: d506
      })


      await data.bulkCreate(cleansingData, {
        transaction: d506,
        updateOnDuplicate: ['epidem_person_status_id', 'hospital_code', 'state', 'update_datetime', 'rec_status', 'cid', "chw_code", "amp_code", 'tmb_code',
          "address", "moo", "road", "epidem_chw_code", "epidem_amp_code", "epidem_tmb_code", 'passport_no', 'prefix', 'first_name', 'last_name', 'comment',
          'treated_hospital_code', 'epidem_report_group_code', 'diagnosis_icd10', 'diagnosis_icd10_list', "death_date", 'treated_date', 'age_y', 'age_m', 'age_d', 'patient_type',
          'report_datetime', 'onset_date', 'diagnosis_date', 'occupation']
      })
     
      const epiToD506Data = cleansingData
        .filter(v => v.epidem_report_guid) 
        .map(v => {
          return {
            UUID: v.epidem_report_guid, 
            resources: `EpiNet To D506`}
        })
      if (epiToD506Data.length > 0) {
        await EpiNetToD506.bulkCreate(epiToD506Data, {
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

const d506ImportToJson = async d506 => {
  try {
    const timeNow = moment.utc().add(7, "hour").format('YYYY-MM-DD HH:mm:ss')
    const unixTime = moment.utc().unix()
    const whereCondition = {
      [Op.and]: [
        { [Op.or]: [{ state: { [Op.in]: [0, 1, 90] } }, { t_ransfer: 1 }] },
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
          ]
        }
      ]
    }
    const findDataBMA = await BmaReport.findAll({
      where: whereCondition,
      attributes: [
        [Sequelize.literal("CONCAT('{', uuid , '}')"), 'epidem_report_guid']
      ],
      raw: true
    }).then(v => v.reduce((acc, v, i) => { acc.push(v.epidem_report_guid); return acc }, []))
    const count = await data.count({
      where: {
        [Op.and]: [
          {
            update_datetime: {
              [Op.gt]: moment.unix(time.time).format('YYYY-MM-DD HH:mm:ss'),
              [Op.lte]: timeNow
            }
          },
          Sequelize.where(
            Sequelize.fn('YEAR', Sequelize.col('onset_date')),
            2026 // antigravity: Updated year 2025 -> 2026
          ),
          {
            [Op.or]: [
              { status: { [Op.in]: [8] } },
              {
                [Op.and]: [
                  { status: { [Op.in]: [5] } },
                  { epidem_report_group_code: { [Op.in]: STATUS5_WHITELIST } }
                ]
              },
              { t_ransfer: 1 }
            ]
          },
          { hospital_code: { [Op.ne]: 12499 } },
          { is_epinet: null },
          { epidem_report_guid: { [Op.notIn]: findDataBMA } }
        ]
      }
    });


    const datalimit = Math.ceil(count / 2500)

    for (let index = 0; index < datalimit; index++) {
      const dataCheck = []
      console.time(`Process ${index}`)

      const findData = await data.findAll({
        where: {
          [Op.and]: [
            {
              update_datetime: {
                [Op.gt]: moment.unix(time.time).format('YYYY-MM-DD HH:mm:ss'),
                [Op.lte]: timeNow
              }
            },
            Sequelize.where(
              Sequelize.fn('YEAR', Sequelize.col('onset_date')),
              2026 // antigravity: Updated year 2025 -> 2026
            ),
            {
              [Op.or]: [
                { status: { [Op.in]: [8] } },
                {
                  [Op.and]: [
                    { status: { [Op.in]: [5] } },
                    { epidem_report_group_code: { [Op.in]: STATUS5_WHITELIST } }
                  ]
                },
                { t_ransfer: 1 }
              ]
            },
            { hospital_code: { [Op.ne]: 12499 } },
            { is_epinet: null },
            { epidem_report_guid: { [Op.notIn]: findDataBMA } }
          ]
        },

        attributes: [
          ['epidem_report_guid', 'uuid'],
          ['cid', 'citizen_id'],
          ['treated_date', 'patient_found'],
          ['passport_no', 'passport_id'],
          ['prefix', 'titlename'],
          ['first_name', 'firstname'],
          ['last_name', 'lastname'],
          ['nationality', 'nationality_code'],
          ['gender', 'gender'],
          ['birth_date', 'birthdate'],
          ['age_y', 'age_year'],
          ['age_m', 'age_month'],
          ['age_d', 'age_day'],
          ['marital_status_id', 'married_status'],
          ['address', 'address'],
          ['moo', 'moo'],
          ['road', 'road'],
          ['chw_code', 'chw_code'],
          ['amp_code', 'amp_code'],
          ['tmb_code', 'tmb_code'],
          ['epidem_address', 'epidem_address'],
          ['epidem_moo', 'epidem_moo'],
          ['epidem_road', 'epidem_road'],
          ['epidem_chw_code', 'epidem_chw_code'],
          ['epidem_amp_code', 'epidem_amp_code'],
          ['epidem_tmb_code', 'epidem_tmb_code'],
          ['mobile_phone', 'contact_mobile'],
          ['occupation', 'work_code'],
          ['epidem_report_group_code', 'disease_code'],
          ['treated_hospital_code', 'cure_loc_code'],
          ['dds_date', 'report_date'],
          ['onset_date', 'patient_sick'],
          ['death_date', 'patient_death'],
          ['informer_name', 'report_name'],
          ['diagnosis_icd10', 'icd_10'],
          ['epidem_person_status_id', 'patient_status'],
          ['dds_date', 'report_time'],
          ['dds_date', 'case_date'],
          ['diagnosis_date', 'diagnosis_date'],
          ['comment', 'remark'],
          ['patient_type', 'patient_type'],
          ['epidem_lab_confirm_type_id', 'lab_method'],
          ['lab_report_result', 'lab_result'],
          ['role_update_hosp', 'report_loc_code'],
          ['state', 'state'],
          ['status', 'status'],
          ['rec_status', 'rec_status'],
          ['dds_date', 'dds_date'],
          ['update_datetime', 'update_datetime'],
          ['t_ransfer', 't_ransfer']
        ],

        order: [['update_datetime', 'ASC']],
        offset: index * 2500,
        limit: 2500,
        raw: true
      });


      // console.log({ findData });
      // const findDup = []
      const justID = []
      for (let i = 0; i < findData.length; i++) {
        const element = findData[i]
        if (element.patient_sick == null) {
          findData[i].patient_sick = element.patient_found ? element.patient_found : element.diagnosis_date
          if (moment(findData[i].patient_sick) < moment("2023-12-31 23:59:59", "YYYY-MM-DD HH:mm:ss")) findData.splice(i, 1)
        }
        if (!element.t_ransfer) {
          justID.push({ epidem_report_guid: { [Op.like]: `%${element.uuid}%` } })
        }
        //   findDup.push({
        //     disease_code: element.disease_code,
        //     firstname: element.firstname.trim(),
        //     lastname: element.lastname.trim(),
        //     cure_loc_code: element.cure_loc_code
        //   })
      }
      // const findE506 = await findDupinE506(findDup)
      // if (findE506.length > 0) {
      //   for (let index = 0; index < findData.length; index++) {
      //     const element = findData[index]
      // if (!element) {
      //   console.warn(`Skipped undefined element at index ${index}`)
      //   continue
      // }
      // const findDuplast = findE506.filter(v => {
      //   return v.disease_code == element.disease_code && v.cure_loc_code == element.cure_loc_code && v.lastname == element.lastname && v.firstname == element.firstname && v.uuid !== element.uuid.replace(/{|}/g, '')
      // })

      // for (let i = 0; i < findDuplast.length; i++) {
      //   const findDupelement = findDuplast[i]
      //   if (findDupelement && findDupelement.uuid !== element.uuid.replace(/{|}/g, '')) {
      //     const findDc = cdDay.find(v => v.code == element.disease_code)
      //     const e506Date = moment(findDupelement.patient_sick)
      //     const d506Date = moment(element.patient_sick)
      //     const differenceInDays = d506Date.diff(e506Date, 'days')
      //     if (!findDc || Math.abs(differenceInDays) <= findDc.day) {
      //   if (differenceInDays < 0 && Math.abs(differenceInDays) <= findDc.day) {
      //     console.log({ uuid: findDupelement.uuid, epidem_report_guid: element.uuid })
      //     const e506 = await BmaReport.findOne({ where: { uuid: findDupelement.uuid }, raw: true })
      //     const d506 = await data.findOne({ where: { epidem_report_guid: element.uuid }, raw: true })
      // dataCheck.push({ e506, d506 })
      // }
      //           findData.splice(index, 1)
      //           justID.splice(index, 1)
      //           index--
      //         }
      //       }
      //     }
      //   }
      // }
      await data.update({ t_ransfer: 1 }, { where: { [Op.or]: justID }, transaction: d506 })

      const jsonData = JSON.stringify(findData, null, 4)
      await fs.writeFile(`D506File/data_${index + 1}.json`, jsonData, 'utf8')
      console.log('JSON file has been saved.')
      if (dataCheck.length > 0) {
        const CheckData = JSON.stringify(dataCheck, null, 4)
        const unixTime = moment.utc().unix()
        await fs.writeFile(`Check/${unixTime}.json`, CheckData, 'utf8')
        console.log('Check file has been saved.')
      }
    }
    return {}
  } catch (error) {
    console.log(error)
    throw error
  }
}

async function FindDupD506(d506_data) {
  try {
    const findDup = []
    const justID = []
    for (let index = 0; index < d506_data.length; index++) {
      const element = d506_data[index]
      justID.push({ epidem_report_guid: { [Op.like]: `%${element.uuid}%` } })
      findDup.push({
        disease_code: element.disease_code,
        firstname: element.firstname.trim(),
        lastname: element.lastname.trim(),
        cure_loc_code: element.cure_loc_code
      })
    }
    return { findDup, justID }
  } catch (error) {
    throw error
  }
}

async function findDupinE506(query) {
  try {
    const findE506Dup = await BmaReport.findAll({
      where: {
        [Op.or]: query
      },
      attributes: ['uuid', 'patient_sick', 'citizen_id', 'disease_code', 'cure_loc_code', 'firstname', 'lastname'],
      raw: true
    })
    return findE506Dup
  } catch (error) {
    throw error
  }
}

function genMod11(number) {
  const str = number.toString()
  let startNumber = 13
  let results = 0

  for (let index = 0; index < str.length; index++) {
    const element = str[index]
    results += +element * startNumber
    startNumber -= 1
  }

  results = results % 11
  results = 11 - results

  if (results >= 10) {
    results = results % 10
  }

  return str + results
}

// async function cleansingDataD506(d506_data) {
//   new Promise(async (resolve, reject) => {
//     try {
//       // console.log(d506_data);
//       // const Data = []
//       const address = await BmaDataThaiAddress.findAll({ attributes: { exclude: ["id"] }, raw: true })
//       const disease_name = await BmaDataDiseases.findAll({ attributes: { exclude: ["id"] }, raw: true })
//       const host_name = await BmaDataPlaceRx.findAll({ attributes: { exclude: ["id"] }, raw: true })
//       for (let index = 0; index < d506_data.length; index++) {
//         const element = d506_data[index]
//         if (!element) {
//           console.warn(`Skipped undefined element at index ${index}`)
//           continue
//         }
//         if (!element.cure_loc_code) {
//           d506_data.splice(index, 1)
//           continue
//         }

//         const host_name_find = host_name.find(v => v.code == +element.cure_loc_code)
//         const findHost = hosp_code.hospcode.find(v => +v.office_id == +element.cure_loc_code)
//         if (!findHost || !host_name_find) {
//           d506_data.splice(index, 1)
//           continue
//         }
//         const epidemAddressCheck = element.epidem_chw_code && element.epidem_amp_code && element.epidem_tmb_code ? true : false
//         const cascateSupDistrictCode = epidemAddressCheck
//           ? element.epidem_chw_code.toString() + element.epidem_amp_code.toString() + element.epidem_tmb_code.toString()
//           : element.chw_code.toString() + element.amp_code.toString() + element.tmb_code.toString()

//         const findAddress = address.find(v => v.district_code == cascateSupDistrictCode)
//         if (findAddress) {
//           d506_data[index].subdistrict_code = findAddress.district_code
//           d506_data[index].district = findAddress.amphoe
//           d506_data[index].subdistrict = findAddress.district
//           d506_data[index].province = findAddress.province
//         } else {
//           const findsubAddress = address.find(v => v.amphoe_code == element.chw_code.toString() + element.amp_code.toString())
//           if (findsubAddress) {
//             d506_data[index].subdistrict_code = findsubAddress.district_code
//             d506_data[index].district = findsubAddress.amphoe
//             d506_data[index].subdistrict = findsubAddress.district
//             d506_data[index].province = findsubAddress.province
//           } else {
//             const findchwAddress = address.find(v => v.province_code == element.chw_code)
//             if (!findchwAddress) {
//               const findHos = hosp_code.hospcode.find(v => +v.office_id == +element.cure_loc_code)
//               d506_data[index].subdistrict_code = findHos.changwatcode.toString() + findHos.ampurcode.toString() + findHos.tamboncode.toString()
//               d506_data[index].district = findHos.ampur
//               d506_data[index].subdistrict = findHos.tambon
//               d506_data[index].province = findHos.changwat
//             } else {
//               d506_data[index].subdistrict_code = findchwAddress.district_code
//               d506_data[index].district = findchwAddress.amphoe
//               d506_data[index].subdistrict = findchwAddress.district
//               d506_data[index].province = findchwAddress.province
//             }
//           }
//         }
//         d506_data[index].address_no = epidemAddressCheck ? element.epidem_address : element.address
//         d506_data[index].moo = epidemAddressCheck ? element.epidem_moo : element.moo
//         d506_data[index].road = epidemAddressCheck ? element.epidem_road : element.road
//         const uuidRegex = element.uuid.includes('{') ? element.uuid.replace(/{|}/g, '') : element.uuid
//         d506_data[index].uuid = uuidRegex
//         delete d506_data[index].chw_code
//         delete d506_data[index].amp_code
//         delete d506_data[index].tmb_code
//         if (element.patient_status == 2 && !d506_data[index].patient_death) {
//           d506_data[index].patient_death = element.report_time
//           // console.log(d506_data[index].patient_death);
//         }
//         d506_data[index].report_time = moment.utc().add(7, "hour").format("YYYY-MM-DD HH:mm")
//         d506_data[index].patient_status = element.patient_status == 1 ? 'หาย' : element.patient_status == 2 ? 'ตาย' : element.patient_status == 3 ? 'ยังรักษาอยู่' : 'ไม่ทราบ'
//         d506_data[index].gender = element.gender == 1 ? 'ชาย' : 'หญิง'
//         d506_data[index].patient_type = element.patient_type == 'IPD' ? 'ผู้ป่วยใน' : element.patient_type == 'ACF' ? 'ค้นพบในชุมชน' : 'ผู้ป่วยนอก'
//         d506_data[index].lab_method = element.lab_method == 2 ? 'ATK' : element.lab_method == 1 ? 'RT-PCR' : element.lab_method == 3 ? 'Antibody' : null
//         switch (element.married_status) {
//           case 1:
//             d506_data[index].married_status = 'โสด'
//             break
//           case 4:
//             d506_data[index].married_status = 'หม้าย'
//             break
//           case 3:
//             d506_data[index].married_status = 'หย่าร้าง'
//             break
//           case 2:
//             d506_data[index].married_status = 'สมรส'
//             break
//           default:
//             d506_data[index].married_status = 'ไม่ทราบ'
//             break
//         }
//         const findWork = work.find(v => v.code == element.work_code)
//         d506_data[index].work = findWork ? findWork.text : null
//         const findNational = national.find(v => +v.code == +element.nationality_code)
//         d506_data[index].nationality = findNational ? findNational.nationality : null
//         d506_data[index].state = +element.status == 8 ? 0 : 99
//         if (d506_data[index].state == null) {
//           console.log(d506_data[index].uuid);
//         }
//         d506_data[index].rec_status = 'active'
//         d506_data[index].hosp_code = ''
//         const findCD_name = disease_name.find(v => +v.code == +element.disease_code)
//         const findCD = disCD.find(v => +v.code == +element.disease_code)
//         if (!findCD || !findCD_name) {
//           d506_data.splice(index, 1)
//           continue
//         }
//         d506_data[index].disease = findCD_name.name
//         d506_data[index].icd_10 = findCD.icd

//         d506_data[index].cure_location = host_name_find.name
//         d506_data[index].report_location = host_name_find.name
//         d506_data[index].report_loc_code = element.cure_loc_code
//         d506_data[index].report_province = findHost ? findHost.changwat : null
//         d506_data[index].added = moment().unix()
//         d506_data[index].updated = moment().unix()
//         d506_data[index].add_name = 'APID506'
//         d506_data[index].report_name = 'D506'
//       }
//       console.log('Final Cleansing Data :' + d506_data.length);

//       resolve({ data: d506_data })
//     } catch (error) {
//       console.log(error)
//       reject(error)
//       throw error
//     }
//   })



// }
async function cleansingDataD506(d506_data) {
  try {
    const address = await BmaDataThaiAddress.findAll({ attributes: { exclude: ["id"] }, raw: true });
    const disease_name = await BmaDataDiseases.findAll({ attributes: { exclude: ["id"] }, raw: true });
    const host_name = await BmaDataPlaceRx.findAll({ attributes: { exclude: ["id"] }, raw: true });


    const cleansedData = d506_data.reduce((acc, element, index) => {
      if (!element || !element.cure_loc_code) {
        console.warn(`Skipped invalid element at index ${index}`);
        return acc;
      }

      const hostName = host_name.find(v => v.code == +element.cure_loc_code);
      const findHost = hosp_code.hospcode.find(v => +v.office_id == +element.cure_loc_code);
      if (!findHost || !hostName) {
        return acc;
      }

      if (element.disease_code == 65 && element.age_year >= 15) {
        return acc;
      }

      const epidemAddressCheck = element.epidem_chw_code && element.epidem_amp_code && element.epidem_tmb_code;
      const cascateSupDistrictCode = epidemAddressCheck
        ? `${element.epidem_chw_code}${element.epidem_amp_code}${element.epidem_tmb_code}`
        : `${element.chw_code}${element.amp_code}${element.tmb_code}`;

      const findAddress = address.find(v => v.district_code == cascateSupDistrictCode);
      if (findAddress) {
        Object.assign(element, {
          subdistrict_code: findAddress.district_code,
          district: findAddress.amphoe,
          subdistrict: findAddress.district,
          province: findAddress.province
        });
      } else {
        const findsubAddress = address.find(v => v.amphoe_code == `${element.chw_code}${element.amp_code}`);
        if (findsubAddress) {
          Object.assign(element, {
            subdistrict_code: findsubAddress.district_code,
            district: findsubAddress.amphoe,
            subdistrict: findsubAddress.district,
            province: findsubAddress.province
          });
        } else {
          const findchwAddress = address.find(v => v.province_code == element.chw_code);
          if (!findchwAddress) {
            const findHos = hosp_code.hospcode.find(v => +v.office_id == +element.cure_loc_code);
            Object.assign(element, {
              subdistrict_code: `${findHos.changwatcode}${findHos.ampurcode}${findHos.tamboncode}`,
              district: findHos.ampur,
              subdistrict: findHos.tambon,
              province: findHos.changwat
            });
          } else {
            Object.assign(element, {
              subdistrict_code: findchwAddress.district_code,
              district: findchwAddress.amphoe,
              subdistrict: findchwAddress.district,
              province: findchwAddress.province
            });
          }
        }
      }

      element.address_no = epidemAddressCheck ? element.epidem_address : element.address;
      element.moo = epidemAddressCheck ? element.epidem_moo : element.moo;
      element.road = epidemAddressCheck ? element.epidem_road : element.road;
      element.uuid = element.uuid.includes('{') ? element.uuid.replace(/{|}/g, '') : element.uuid;

      delete element.chw_code;
      delete element.amp_code;
      delete element.tmb_code;

      if (element.patient_status == 2 && !element.patient_death) {
        element.patient_death = element.report_time;
      }

      if (element.patient_death) {
        element.patient_status = 2
      }

      element.report_time = moment.utc().subtract(5, "hours").format("YYYY-MM-DD HH:mm");
      console.log(element.case_date, element.report_date, element.uuid);
      element.case_date = moment.utc(element.case_date).subtract(5, "hours").format("YYYY-MM-DD HH:mm")
      element.report_date = moment.utc(element.report_date).subtract(5, "hours").format("YYYY-MM-DD HH:mm")
      console.log(element.case_date, element.report_date, element.uuid);

      element.patient_status = ['ไม่ทราบ', 'หาย', 'ตาย', 'ยังรักษาอยู่'][element.patient_status] || 'ไม่ทราบ';
      element.gender = element.gender == 1 ? 'ชาย' : 'หญิง';
      element.patient_type = element.patient_type === 'IPD' ? 'ผู้ป่วยใน' : element.patient_type === 'ACF' ? 'ค้นพบในชุมชน' : 'ผู้ป่วยนอก';
      element.lab_method = ['RT-PCR', 'ATK', 'Antibody'][element.lab_method - 1] || null;
      element.married_status = ['ไม่ทราบ', 'โสด', 'คู่', 'หย่าร้าง', 'หม้าย'][element.married_status] || 'ไม่ทราบ';

      const findWork = work.find(v => v.code == element.work_code);
      element.work = findWork ? findWork.text : null;

      const findNational = national.find(v => +v.code == +element.nationality_code);
      element.nationality = findNational ? findNational.nationality : null;
      const code = String(element.disease_code).padStart(2, '0')
      const isWhitelist = STATUS5_WHITELIST.includes(code)

      if (element.state != 0 && element.state != null) {
        // Keep existing non-zero state, but prevent 100 for non-whitelist diseases
        if (String(element.state) === '100' && !isWhitelist) {
          element.state = 99
        } else {
          element.state = element.state
        }
      } else if (+element.status === 8) {
        element.state = 0
      } else if (
        +element.status === 5 &&
        isWhitelist
      ) {
        element.state = 100
      } else {
        element.state = 99
      }

      element.rec_status = 'active';
      element.hosp_code = '';
      element.t_ransfer = '1';
      const findCD_name = disease_name.find(v => +v.code == +element.disease_code);
      const findCD = disCD.find(v => +v.code == +element.disease_code);
      if (!findCD || !findCD_name) {
        return acc;
      }

      Object.assign(element, {
        disease: findCD_name.name,
        icd_10: findCD.icd,
        cure_location: hostName.name,
        report_location: hostName.name,
        report_loc_code: element.cure_loc_code,
        report_province: findHost ? findHost.changwat : null,
        //added: moment().unix(),
        added: moment(element.report_date, "YYYY-MM-DD").isSame(moment(), 'day') ? moment().unix() : (moment(element.report_date, "YYYY-MM-DD HH:mm").isValid() ? moment(element.report_date, "YYYY-MM-DD HH:mm").unix() : moment().unix()),       
        updated: moment().unix(),
        add_name: 'APID506',
        report_name: 'D506'
      });
      acc.push(element);
      return acc;
    }, []);

    console.log('Final Cleansing Data:', cleansedData.length);
    return { data: cleansedData };
  } catch (error) {
    console.error('Error cleansing data:', error);
    throw error;
  }
}
module.exports = { e506JsonTransferToD506, d506ImportToJson, cleansingDataD506 }
