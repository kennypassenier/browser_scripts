'use strict';
if (!location.host.startsWith('www.')) return;
location.replace(location.protocol + '//old.reddit.com' + location.pathname + location.search);
