'use strict';
(function() {
  // Check of we inderdaad op de WhatsApp API pagina zijn
  if (window.location.href.includes(`api.whatsapp.com/send`)) {
    // Aantal seconden wachten voor het sluiten
    // 8 seconden is meestal ideaal om de app te laten triggeren
    const sluitVertraging = 3000;

    console.log(`WhatsApp tabblad gedetecteerd, sluit over ${  sluitVertraging / 1000  } seconden...`);

    setTimeout(() => {
      window.close();
    }, sluitVertraging);
  }
})();
