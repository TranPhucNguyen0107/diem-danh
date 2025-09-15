// script.js (module) - dùng chung cho index.html & stats.html
// import Firebase modular SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getFirestore, doc, setDoc, getDoc, collection, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

/* ---------- FIREBASE CONFIG (thay nếu cần) ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyBqjXm4Wf6iTGRVfNwh-MdsODzpA5dle0w",
  authDomain: "attendance-4f1ba.firebaseapp.com",
  projectId: "attendance-4f1ba",
  storageBucket: "attendance-4f1ba.appspot.com",
  messagingSenderId: "882289101357",
  appId: "1:882289101357:web:baa9072b64f97c0bf786a4",
  measurementId: "G-ZT7L08RG9Q"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ---------- STUDENTS (from your CSV sample) ---------- */
const STUDENTS = [
  { stt: 1, thanh: "Isave", ho: "Huỳnh Trâm", ten: "Anh" },
  { stt: 2, thanh: "VinhSơn", ho: "Vũ Ngọc Minh", ten: "Duy" },
  { stt: 3, thanh: "Maria", ho: "Nguyễn Ngọc", ten: "Hân" },
  { stt: 4, thanh: "Teresa", ho: "Trần Ngân", ten: "Khánh" },
  { stt: 5, thanh: "Phero", ho: "Phan Anh", ten: "Khoa" },
  { stt: 6, thanh: "Giuse Maria", ho: "Phạm Đăng", ten: "Khoa" },
  { stt: 7, thanh: "Đa Minh", ho: "Đỗ Tùng", ten: "Lâm" },
  { stt: 8, thanh: "Maria", ho: "Bùi Nguyễn Khánh", ten: "Linh" },
  { stt: 9, thanh: "Maria", ho: "Đặng Ngọc Thảo", ten: "My" },
  { stt: 10, thanh: "Đa Minh", ho: "Phạm Hoàng", ten: "Nguyên" },
  { stt: 11, thanh: "Teresa", ho: "Lê Trần Quỳnh", ten: "Như" },
  { stt: 12, thanh: "Giuse", ho: "Bùi Hồng", ten: "Phúc" },
  { stt: 13, thanh: "Giuse", ho: "Trần Hoàng", ten: "Phúc" },
  { stt: 14, thanh: "Gioan Baotixita", ho: "Nguyễn Đỗ Minh", ten: "Quân" },
  { stt: 15, thanh: "Giuse", ho: "Nguyễn Hữu", ten: "Thiện" },
  { stt: 16, thanh: "Teresa", ho: "Trần Bảo", ten: "Trân" },
  { stt: 17, thanh: "Phaolo", ho: "Nguyễn Cao", ten: "Trí" },
  { stt: 18, thanh: "VinhSơn", ho: "Hoàng Tiến", ten: "Triển" }
];

/* ---------- UTILITIES ---------- */
function qsel(sel, ctx = document) { return ctx.querySelector(sel); }
function qselAll(sel, ctx = document) { return Array.from(ctx.querySelectorAll(sel)); }
function isoToday() { return new Date().toISOString().slice(0,10); }

// Return last (most recent) Sunday (if today is Sunday returns today)
function getLastSundayISO(){
  const today = new Date();
  const day = today.getDay(); // 0 Sun
  const diff = day === 0 ? 0 : -day; // if Sunday -> 0, else go back day days
  const target = new Date(today);
  target.setDate(today.getDate() + diff);
  return target.toISOString().slice(0,10);
}

/* ---------- ATTENDANCE PAGE ---------- */
if (document.body.dataset.page === "attendance") {
  const dateInput = qsel("#attendance-date");
  const tbody = qsel("#attendance-body");
  const saveBtn = qsel("#saveBtn");
  const clearBtn = qsel("#clearBtn");
  const msg = qsel("#msg");

  function showMsg(text, ok = true){
    if (!msg) return;
    msg.textContent = text;
    msg.style.color = ok ? "green" : "crimson";
    setTimeout(()=> { if (msg.textContent === text) msg.textContent = ""; }, 3000);
  }

  // render rows
  function renderRows(data = {}){
    tbody.innerHTML = "";
    STUDENTS.forEach(s => {
      const key = String(s.stt);
      const rec = data[key] || {};
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${s.stt}</td>
        <td>${escapeHtml(s.thanh)}</td>
        <td>${escapeHtml(s.ho)}</td>
        <td>${escapeHtml(s.ten)}</td>

        <td><input type="radio" name="mass-${key}" value="Sớm" ${rec.mass === "Sớm" ? "checked": ""}></td>
        <td><input type="radio" name="mass-${key}" value="Có mặt" ${rec.mass === "Có mặt" ? "checked": ""}></td>
        <td><input type="radio" name="mass-${key}" value="Trễ" ${rec.mass === "Trễ" ? "checked": ""}></td>

        <td><input type="radio" name="class-${key}" value="Có mặt" ${rec.class === "Có mặt" ? "checked": ""}></td>
        <td><input type="radio" name="class-${key}" value="Vắng" ${rec.class === "Vắng" ? "checked": ""}></td>
      `;
      tbody.appendChild(tr);
    });
  }

  // load attendance for a date
  async function loadForDate(date){
    if (!date) return renderRows();
    try {
      const dref = doc(db, "attendance", date);
      const snap = await getDoc(dref);
      if (snap.exists()){
        renderRows(snap.data().records || {});
        showMsg(`Đã tải dữ liệu cho ${date}`);
      } else {
        renderRows(); // empty
        showMsg(`Chưa có dữ liệu cho ${date} — bạn có thể nhập mới`);
      }
    } catch (err) {
      console.error("loadForDate error", err);
      showMsg("Lỗi tải dữ liệu (xem console)", false);
      renderRows();
    }
  }

  // save attendance for date
  async function saveForDate(){
    const date = dateInput.value;
    if (!date){ showMsg("Vui lòng chọn ngày!", false); return; }

    const records = {};
    STUDENTS.forEach(s => {
      const k = String(s.stt);
      const massVal = qsel(`input[name="mass-${k}"]:checked`)?.value || "Vắng";
      const classVal = qsel(`input[name="class-${k}"]:checked`)?.value || "Vắng";
      records[k] = {
        stt: s.stt, thanh: s.thanh, ho: s.ho, ten: s.ten,
        mass: massVal, class: classVal
      };
    });

    try {
      await setDoc(doc(db, "attendance", date), { records, updatedAt: new Date().toISOString() });
      showPopup("Đã lưu điểm danh thành công!", "success");

    } catch (err) {
      console.error("saveForDate error", err);
showPopup("Có lỗi khi lưu điểm danh!", "error");
    }
  }

  function clearUI(){
    qselAll('input[type="radio"]').forEach(r => r.checked = false);
    showMsg("Đã xóa chọn (chỉ UI)");
  }

  // init
  (async function initAttendance(){
    dateInput.value = getLastSundayISO();
    dateInput.addEventListener("change", e => loadForDate(e.target.value));
    saveBtn.addEventListener("click", saveForDate);
    clearBtn.addEventListener("click", clearUI);
    await loadForDate(dateInput.value);
  })();
}

/* ---------- STATISTICS PAGE ---------- */
if (document.body.dataset.page === "statistics") {
  const summaryBody = qsel("#summary-body");
  const refreshBtn = qsel("#refreshStats");
  const exportSummaryBtn = qsel("#exportSummary");
  const detailSection = qsel("#detail-section");
  const detailNameEl = qsel("#detail-name");
  const detailsBody = qsel("#details-body");
  const exportDetailsBtn = qsel("#exportDetails");
  const closeDetailsBtn = qsel("#closeDetails");
  const statMsg = qsel("#stat-msg");

  function showStatMsg(t, ok = true){
    if (!statMsg) return;
    statMsg.textContent = t;
    statMsg.style.color = ok ? "green" : "crimson";
    setTimeout(()=> { if (statMsg.textContent === t) statMsg.textContent = ""; }, 3000);
  }

  // compute aggregate summary across all attendance docs
  async function loadSummary(){
    try {
      const q = query(collection(db, "attendance"), orderBy("updatedAt","asc"));
      const snaps = await getDocs(q);

      // init counts
      const summary = {};
      STUDENTS.forEach(s => {
        const key = String(s.stt);
        summary[key] = {
          stt: s.stt, thanh: s.thanh, ho: s.ho, ten: s.ten,
          mass: { "Sớm":0, "Có mặt":0, "Trễ":0, "Vắng":0 },
          class: { "Có mặt":0, "Vắng":0 },
          details: [] // array of {date, mass, class}
        };
      });

      snaps.forEach(docSnap => {
        const data = docSnap.data();
        if (!data || !data.records) return;
        const date = docSnap.id;
        const records = data.records;
        Object.keys(records).forEach(k => {
          const r = records[k];
          if (!r) return;
          if (summary[k]) {
            const massVal = r.mass || "Vắng";
            const classVal = r.class || "Vắng";
            if (summary[k].mass.hasOwnProperty(massVal)) summary[k].mass[massVal]++;
            else summary[k].mass["Vắng"]++;
            if (summary[k].class.hasOwnProperty(classVal)) summary[k].class[classVal]++;
            else summary[k].class["Vắng"]++;
            summary[k].details.push({ date, mass: massVal, class: classVal });
          }
        });
      });

      // render summary table
      summaryBody.innerHTML = "";
      Object.values(summary).forEach(s=>{
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${s.stt}</td>
          <td>${escapeHtml(s.thanh)}</td>
          <td>${escapeHtml(s.ho)}</td>
          <td>${escapeHtml(s.ten)}</td>
          <td>${s.mass["Sớm"]}</td>
          <td>${s.mass["Có mặt"]}</td>
          <td>${s.mass["Trễ"]}</td>
          <td>${s.class["Có mặt"]}</td>
          <td>${s.class["Vắng"]}</td>
          <td><button class="detail-btn" data-key="${s.stt}">Xem</button></td>
        `;
        summaryBody.appendChild(tr);
      });

      // attach detail handlers
      qselAll(".detail-btn").forEach(btn=>{
        btn.addEventListener("click", (e)=>{
          const stt = btn.dataset.key;
          // find student details in summary
          // reload summary to get latest details (we can reuse summary map above if retained)
          showDetailsFor(stt);
        });
      });

      showStatMsg("✅ Đã tải thống kê");
      return summary; // return for export if needed
    } catch (err) {
      console.error("loadSummary error", err);
      showStatMsg("❌ Lỗi tải thống kê", false);
    }
  }

  // show details for a student (gathers from docs)
  async function showDetailsFor(sttKey){
    try {
      // re-query all docs and extract records for that stt
      const snaps = await getDocs(query(collection(db, "attendance"), orderBy("updatedAt","asc")));
      const rows = [];
      snaps.forEach(docSnap => {
        const d = docSnap.data();
        if (!d || !d.records) return;
        const rec = d.records[String(sttKey)];
        if (rec) rows.push({ date: docSnap.id, mass: rec.mass || "Vắng", class: rec.class || "Vắng" });
      });

      // render
      detailNameEl.textContent = `STT ${sttKey}`;
      detailsBody.innerHTML = "";
      rows.forEach(r=>{
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${r.date}</td><td>${escapeHtml(r.mass)}</td><td>${escapeHtml(r.class)}</td>`;
        detailsBody.appendChild(tr);
      });
      detailSection.style.display = "block";

      // set exportDetails
      exportDetailsBtn.onclick = ()=> {
        exportDetailsCSV(sttKey, rows);
      };
      closeDetailsBtn.onclick = ()=> { detailSection.style.display = "none"; };

    } catch (err) {
      console.error("showDetailsFor error", err);
      showStatMsg("❌ Lỗi khi tải chi tiết", false);
    }
  }

  function exportSummaryCSV(summaryMap){
    // summaryMap can be retrieved by calling loadSummary() above; to keep it simple we'll reconstruct table DOM to CSV
    const rows = [];
    rows.push(["STT","Tên Thánh","Họ","Tên","Lễ-Sớm","Lễ-Có mặt","Lễ-Trễ","Học-Có mặt","Học-Vắng"].join(","));
    qselAll("#summary-body tr").forEach(tr=>{
      const cols = Array.from(tr.querySelectorAll("td")).slice(0,9).map(td => `"${td.innerText.replace(/"/g,'""')}"`);
      rows.push(cols.join(","));
    });
    const csv = rows.join("\n");
    downloadCSV(csv, "summary_attendance.csv");
  }

  function exportDetailsCSV(stt, rows){
    const out = [];
    out.push(["STT","Ngày","Đi lễ","Đi học"].join(","));
    rows.forEach(r=>{
      out.push([stt, r.date, r.mass, r.class].map(v => `"${String(v).replace(/"/g,'""')}"`).join(","));
    });
    downloadCSV(out.join("\n"), `details_${stt}.csv`);
  }

  function downloadCSV(text, filename){
    const blob = new Blob([text], {type: "text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // init
  (function initStats(){
    loadSummary();
    refreshBtn.addEventListener("click", loadSummary);
    exportSummaryBtn.addEventListener("click", ()=> exportSummaryCSV());
  })();
}

/* ---------- small helpers ---------- */
function escapeHtml(str){
  if (!str && str !== 0) return "";
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}
// Hàm hiển thị popup
function showPopup(message, type = "success") {
  const popup = document.getElementById("popup");
  const title = document.getElementById("popup-title");
  const msg = document.getElementById("popup-message");

  if (type === "success") {
    title.textContent = "✅ Thành công";
    popup.className = "success";
  } else {
    title.textContent = "❌ Lỗi";
    popup.className = "error";
  }

  msg.textContent = message;

  popup.classList.add("show");

  setTimeout(() => {
    popup.classList.remove("show");
  }, 2000);
}

showPopup("Lưu điểm danh thành công!", "success");
// hoặc nếu lỗi:
showPopup("Có lỗi xảy ra, vui lòng thử lại!", "error");

