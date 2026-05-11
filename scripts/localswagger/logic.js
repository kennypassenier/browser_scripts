function autoClick() {
    const buttons = document.querySelectorAll(".opblock-summary-control");
    buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
            setTimeout(function () {
                const tryItOutButtons = document.querySelectorAll(".btn");
                tryItOutButtons.forEach((tryBtn) => {
                    if (tryBtn.textContent.trim() === "Try it out") {
                        tryBtn.click()
                    }
                });
            }, 250);
        })
    });
}
setTimeout(autoClick, 1000);