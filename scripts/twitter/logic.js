'use strict';
function redirectToXCancel() {
  const u = new URL(location.href);
  u.hostname = `xcancel.com`;
  location.href = u.toString();
}

redirectToXCancel();
