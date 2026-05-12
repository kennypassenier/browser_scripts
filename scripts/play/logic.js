// Skip fucking ads

// setInterval(function() {
// 	/*
// 	let button = document.querySelector("[aria-label='Skip Ad']");
// 	console.log(button);
// 	if(button){
// 		button.click();
// 	}
// 	let buttons = document.querySelectorAll("button");
// 	for(let button of buttons){
// 		console.log(button.textContent);
// 		if(button.textContent === "Advertentie overslaan"){
// 			button.click();
// 		}
// 	}
// 	*/

// 	// Div selecteren met de text "Advertentie overslaan"
// 	let divs = document.querySelectorAll("div");
// 	for(let div of divs){
// 		if(div.textContent === "Advertentie overslaan"){
// 			console.log(div.parentElement);
// 			// Select parent which is a button
// 			div.parentElement.click();
// 		}
// 		if(div.innerText === "Advertentie overslaan"){
// 			console.log("het was den innertext");
// 			console.log(div.parentElement);
// 			div.parentElement.click();

// 		}
// 	}


// }, 1000);

// // Keep focus to trick ads that require focus
// Object.defineProperty(document, "hidden", { value : false});
console.log("Custom script running");

function stopEventListeners() {
    // Adds event listeners for certain scenarios to prevent similar ones from triggering
    // For example, there are listeners for the blur event
    // If we add one ourselves and stop the propagation, the other blur ones won't be triggered in theory
    window.addEventListener("blur", function (event) {
        event.stopImmediatePropagation();
        console.log("Stopping blur event");
    }, true);
    window.addEventListener("focus", function (event) {
        event.stopImmediatePropagation();
        console.log("Stopping focus event");
    }, true);
    window.addEventListener("pagehide", function (event) {
        event.stopImmediatePropagation();
        console.log("Stopping pagehide event");
    }, true);
    window.addEventListener("pageshow", function (event) {
        event.stopImmediatePropagation();
        console.log("Stopping pageshow event");
    }, true);
}

async function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function avoidSpoilers(milliseconds) {
    if (milliseconds > 3000) return;
    await sleep(milliseconds);
    let items = document.querySelectorAll("#afleveringen .l-carousel-item--landscape");
    items.forEach((item) => {
        let playedElement = item.querySelector(".duration-bar__progress");
        // console.log(playedElement);
        let played = playedElement?.style.width;
        // console.log(played);
        if (played && parseInt(played) === 0) {
            // console.log("Geldig: " + played);
            let imageElement = item.querySelector(".scale-image");
            imageElement.style.backgroundImage = "";
            // console.log(imageElement);
        }
    });
    // Hero banner verwijderen op de homepage
    let item = document.querySelector(".hero-video__overlay");
    if (item) {
        item.style.backgroundImage = "";
    }
    avoidSpoilers(milliseconds + 100);
}

avoidSpoilers(0);
stopEventListeners();