// script.js — ใช้ร่วมกันทุกหน้า
// หน้า product.html: โหลดสินค้า + กรองตาม mood
// หน้า order.html:   เติม items/total จาก URL + ส่งออเดอร์เข้า Google Apps Script
// หน้า admin.html:   ดึง Google Sheet (CSV) มาแสดงเป็นตาราง เรียงล่าสุดก่อน

var SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwevQyBtpJdryFnR5feMF-kB36R4wjK_MRzP2q9iG9O5aE-CkuZGKd5IHa_Q1618PU/exec';

var SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQdzRT5hQv_OPh1yu3-yXW5wmKxxF50kiADUiLb8iFQay6YpAZx9eXyxzji0GbOgixLhJYw5udBQaeG/pub?gid=0&single=true&output=csv';

// ปุ่มกรอง: key ต้องตรงกับ field "mood" ใน products.json
var MOODS = [
  { key: 'all',       label: 'ทั้งหมด' },
  { key: 'fresh',     label: 'Fresh' },
  { key: 'sweet',     label: 'Sweet' },
  { key: 'confident', label: 'Confident' },
  { key: 'romance',   label: 'Romance' }
];

// สีการ์ดตาม mood (class ใน style.css)
var CARD_THEME = { fresh: 'dawn', sensual: 'night' };

document.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('product-list')) initProductPage();
  if (document.getElementById('orderForm')) initOrderPage();
  if (document.getElementById('ordersTable')) initAdminPage();
});

/* ---------------------------------------------------------
   หน้าสินค้า (product.html)
--------------------------------------------------------- */
function initProductPage() {
  var filterBar = document.getElementById('filter-bar');
  var list = document.getElementById('product-list');
  var params = new URLSearchParams(window.location.search);
  var current = (params.get('mood') || 'all').toLowerCase();

  fetch('products.json')
    .then(function (res) {
      if (!res.ok) throw new Error('โหลด products.json ไม่สำเร็จ');
      return res.json();
    })
    .then(function (products) {
      renderFilters();
      renderProducts();

      function renderFilters() {
        if (!filterBar) return;
        filterBar.innerHTML = '';
        MOODS.forEach(function (m) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn filter-btn' + (m.key === current ? ' active' : '');
          btn.textContent = m.label;
          btn.addEventListener('click', function () {
            current = m.key;
            renderFilters();
            renderProducts();
          });
          filterBar.appendChild(btn);
        });
      }

      function renderProducts() {
        list.innerHTML = '';
        var shown = products.filter(function (p) {
          return current === 'all' || String(p.mood).toLowerCase() === current;
        });

        if (shown.length === 0) {
          var empty = document.createElement('p');
          empty.textContent = 'ยังไม่มีสินค้าในหมวดนี้';
          list.appendChild(empty);
          return;
        }

        shown.forEach(function (p) {
          list.appendChild(buildCard(p));
        });
      }
    })
    .catch(function (error) {
      console.error(error);
      list.textContent = 'ไม่สามารถโหลดรายการสินค้าได้ กรุณาลองใหม่อีกครั้ง';
    });
}

function buildCard(p) {
  var card = document.createElement('article');
  card.className = 'product-card ' + (CARD_THEME[p.mood] || '');

  var img = document.createElement('img');
  img.className = 'product-image';
  img.src = p.image;
  img.alt = p.name;
  img.loading = 'lazy';

  var body = document.createElement('div');
  body.className = 'product-body';

  var name = document.createElement('h3');
  name.textContent = p.name;

  var size = document.createElement('p');
  size.className = 'size';
  size.textContent = p.size;

  var meta = document.createElement('div');
  meta.className = 'product-meta';

  var price = document.createElement('span');
  price.className = 'price';
  price.textContent = Number(p.price).toLocaleString('th-TH') + ' ฿';

  var buy = document.createElement('a');
  buy.className = 'btn';
  buy.textContent = 'สั่งซื้อ';
  buy.href = 'order.html?item=' + encodeURIComponent(p.name + ' ' + p.size) +
             '&price=' + encodeURIComponent(p.price);

  meta.appendChild(price);
  meta.appendChild(buy);
  body.appendChild(name);
  body.appendChild(size);
  body.appendChild(meta);
  card.appendChild(img);
  card.appendChild(body);
  return card;
}

/* ---------------------------------------------------------
   หน้าสั่งซื้อ (order.html)
--------------------------------------------------------- */
function initOrderPage() {
  var params = new URLSearchParams(window.location.search);
  var itemsInput = document.getElementById('items');
  var totalInput = document.getElementById('total');

  // เติมทั้งสองช่องทันทีที่โหลดหน้า
  if (itemsInput) itemsInput.value = params.get('item') || '';
  if (totalInput) totalInput.value = params.get('price') || '';

  var form = document.getElementById('orderForm');
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var payload = {
      customerName: document.getElementById('customerName').value,
      contact: document.getElementById('contact').value,
      items: document.getElementById('items').value,
      total: document.getElementById('total').value,
      note: document.getElementById('note').value
    };

    var submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    .then(() => { window.location.href = 'thankyou.html'; })
    .catch(error => {
      console.error(error);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      if (submitBtn) submitBtn.disabled = false;
    });
  });
}

/* ---------------------------------------------------------
   หน้าแอดมิน (admin.html)
--------------------------------------------------------- */
function initAdminPage() {
  var tbody = document.querySelector('#ordersTable tbody');
  if (!tbody) return;

  // &_= กัน browser cache ข้อมูลเก่า
  fetch(SHEET_CSV_URL + '&_=' + Date.now())
    .then(function (res) {
      if (!res.ok) throw new Error('โหลดข้อมูลจาก Google Sheet ไม่สำเร็จ');
      return res.text();
    })
    .then(function (text) {
      var rows = parseCSV(text).filter(function (r) {
        return r.some(function (cell) { return cell.trim() !== ''; });
      });

      // ถ้าแถวแรกเป็นหัวตาราง (ช่องวันเวลาไม่มีตัวเลข) ให้ข้ามไป
      if (rows.length && !/\d/.test(rows[0][0])) rows.shift();

      // ล่าสุดขึ้นก่อน (Apps Script ต่อแถวใหม่ไว้ท้ายชีต)
      rows.reverse();

      tbody.innerHTML = '';
      if (rows.length === 0) {
        showMessageRow('ยังไม่มีออเดอร์');
        return;
      }

      rows.forEach(function (r) {
        var tr = document.createElement('tr');
        for (var i = 0; i < 6; i++) {
          var td = document.createElement('td');
          td.textContent = r[i] || '';
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      });
    })
    .catch(function (error) {
      console.error(error);
      showMessageRow('ไม่สามารถโหลดข้อมูลออเดอร์ได้ กรุณาลองใหม่อีกครั้ง');
    });

  function showMessageRow(message) {
    tbody.innerHTML = '';
    var tr = document.createElement('tr');
    var td = document.createElement('td');
    td.colSpan = 6;
    td.textContent = message;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
}

// parse CSV เอง: รองรับช่องที่ครอบด้วย "...", เครื่องหมาย "" ซ้อน,
// เครื่องหมายจุลภาคและขึ้นบรรทัดใหม่ในช่อง, และ \r\n
function parseCSV(text) {
  var rows = [];
  var row = [];
  var field = '';
  var inQuotes = false;

  for (var i = 0; i < text.length; i++) {
    var c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }

  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
