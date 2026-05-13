'use strict';
let checkInterval; // declared here so fillInForm can reference it before it's assigned
const fillInForm = () => {
  const address = document.querySelector(`#address`);
  const town = document.querySelector(`#town`);
  const name = document.querySelector(`#surname`);
  const email = document.querySelector(`#email`);
  const telephone = document.querySelector(`#phonenumber`);
  const deliveryTime = document.querySelector(`#deliverytime`);

  if (address && town && name && email && telephone && deliveryTime) {
    console.log(`All required elements exist.`);
    // Perform your actions here, then stop checking
    address.value = `Daallaan 22`;
    town.value = `Kampenhout`;
    name.value = `Kenny Passenier`;
    email.value = `mendax1@gmail.com`;
    telephone.value = `+32485472050`;
    deliveryTime.value = `asap`;
    clearInterval(checkInterval); // Stop checking after elements are found
  } else {
    console.log(`Still waiting for all elements to be available...`);
    // You can add any fallback or loading actions here if needed
  }
};

// Check every X seconds (e.g., 2000 ms = 2 seconds)
checkInterval = setInterval(fillInForm, 2000);
