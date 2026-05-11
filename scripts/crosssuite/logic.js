// Toggle male

function enterData() {
    const firstName = document.querySelector('#ea-forename-inp');
    const lastName = document.querySelector('#ea-surname-inp');
    const initials = document.querySelector('#initials');
    const email = document.querySelector("#ea-email-inp")
    const day = document.querySelector('#ea-birth-day-inp');
    const month = document.querySelector('#ea-birth-month-inp');
    const year = document.querySelector('#ea-birth-year-inp');
    const houseNumber = document.querySelector('#nr');
    const city = document.querySelector('#city');
    const phoneNumber = document.querySelector('#ea-cellphone-inp');
    const reason = document.querySelector("#comments");
    const postalCode = document.querySelector('input[name="addr_psc"]');
    const street = document.querySelector('input[name="street"]');
    const maleRadio = document.querySelector("#ea-male-rad");
    // firstName.value = "Kenny";
    enterInput(firstName, "Kenny");
    enterInput(lastName, "Passenier");
    enterInput(initials, "kp");
    enterInput(email, "kennypassenier@gmail.com");
    enterInput(day, "25");
    enterInput(month, "09");
    enterInput(year, "1986");
    enterInput(houseNumber, "22");
    enterInput(city, "Kampenhout");
    enterInput(phoneNumber, "485472050");
    enterInput(reason, "");
    enterInput(postalCode, "1910");
    enterInput(street, "Daallaan");
    // maleRadio.checked = true;
    maleRadio.click();
}

function enterInput(inputElement, data) {
    // Angular wants to validate, so we need to dispatch the input event manually
    inputElement.value = data;
    inputElement.dispatchEvent(new Event('input', {
        bubbles: true,
        cancelable: true,
    }));
}

setTimeout(enterData, 5000);