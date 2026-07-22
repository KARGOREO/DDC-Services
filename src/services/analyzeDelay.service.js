const fs = require("fs");
const XLSX = require("xlsx");
const path = require("path");

function calculateDelay(dateCreate, dateAdded) {
  const d1 = new Date(dateCreate);
  const d2 = new Date(dateAdded);

  const diffMs = d1 - d2;

  if (isNaN(diffMs) || diffMs <= 0) {
    return { days: 0, hours: 0, mins: 0, isLate: false };
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, mins, isLate: true };
}

const formatToStandard = (date) => {
  const pad = (num) => num.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const execute = (d506FilePath, eFormFilePath) => {
  return new Promise((resolve, reject) => {
    try {
      const d506Raw = fs.readFileSync(d506FilePath, "utf8").replace(/\\'/g, "");
      const eFormRaw = fs.readFileSync(eFormFilePath, "utf8").replace(/\\'/g, "");

      const d506Data = JSON.parse(d506Raw);
      const eFormData = JSON.parse(eFormRaw);

      const eFormMap = new Map();
      eFormData.forEach((item) => {
        if (item.uuid) {
          const cleanUuid = item.uuid.replace(/[{}]/g, "").toLowerCase();
          const dateSource = item["FROM_UNIXTIME(added)"] || item.added;
          let epiNetDate = null;

          if (dateSource) {
            epiNetDate = isNaN(dateSource) ? new Date(dateSource) : new Date(dateSource * 1000);
          }
          eFormMap.set(cleanUuid, epiNetDate);
        }
      });

      const normalData = [];
      const warningData = [];
      const criticalData = [];

      d506Data.forEach((item) => {
        const d506Time = item.create_datetime;
        const rawGuid = item.epidem_report_guid || "";
        const cleanGuid = rawGuid.replace(/[{}]/g, "").toLowerCase();
        const epiNetTime = eFormMap.get(cleanGuid);

        if (d506Time && epiNetTime instanceof Date && !isNaN(epiNetTime)) {
          const diff = calculateDelay(d506Time, epiNetTime);

          const row = {
            epidem_report_guid: rawGuid,
            hospital_code: item.hospital_code,
            cid: item.cid,
            diagnosis_date: item.diagnosis_date,
            dds_date: item.dds_date,
            create_datetime: d506Time,
            "วันเวลาที่บันทึกใน EPI-Net": formatToStandard(epiNetTime), 
            ระยะเวลาที่ล่าช้า: `${diff.days} วัน ${diff.hours} ชม. ${diff.mins} นาที`,
            สถานะ: "",
          };

          if (diff.isLate && diff.days >= 2) {
            row["สถานะ"] = "ล่าช้าผิดปกติ (ตั้งแต่ 2 วันขึ้นไป)";
            criticalData.push(row);
          } else if (diff.isLate && diff.days >= 1) {
            row["สถานะ"] = "ล่าช้า (1-2 วัน)";
            warningData.push(row);
          } else {
            row["สถานะ"] = "ปกติ";
            normalData.push(row);
          }
        }
      });

      const workbook = XLSX.utils.book_new();
      const addSheet = (data, name) => {
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, ws, `${name} (${data.length})`);
      };

      addSheet(normalData, "ปกติ");
      addSheet(warningData, "ล่าช้า 1-2วัน");
      addSheet(criticalData, "เกิน 2วัน");

      const outputFileName = `D506_Analysis_Report_Final_${Date.now()}.xlsx`;
      const outputPath = path.join(process.cwd(), 'uploads', outputFileName);
      XLSX.writeFile(workbook, outputPath);

      resolve({
        outputPath,
        summary: {
          normal: normalData.length,
          warning: warningData.length,
          critical: criticalData.length
        }
      });

    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  execute
};
