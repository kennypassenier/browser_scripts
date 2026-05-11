'use strict';
// Functions
const timeout = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}
const addCustomMenu = () => {
    const header = document.querySelector("#header-bottom-right"); // We need this to attach the customMenu too
    const sidebarLink = document.createElement("a");
    sidebarLink.id = "sidebarToggle";
    sidebarLink.href = "#";
    sidebarLink.className = "strikeThrough";
    sidebarLink.textContent = "Sidebar";
    header.appendChild(generateSeperator());
    header.appendChild(sidebarLink);
}
const generateSeperator = () => {
    const seperator = document.createElement("span");
    seperator.textContent = " | ";
    seperator.className = "seperator";
    //console.log(seperator);
    return seperator;
}
const toggleElement = (el) => {
    el.style.display === "none" ? el.style.display = "block" : el.style.display = "none";
}
const applyStrikeThrough = (el) => {
    el.classList.toggle("strikeThrough");
}
const clickShowImages = async () => {
    await timeout(100);
    document.querySelector(".res-show-images a").click();
}
const removeExtraUserInfo = (el) => {
    const accountSwitcher = el.querySelector("#RESAccountSwitcherIcon");
    const userlink = el.querySelector("a");
    el.textContent = "";
    el.appendChild(userlink);
    el.appendChild(accountSwitcher);
}
const loginUser = () => {
    console.log("Start of login function");
    const userSpan = document.querySelector("#header-bottom-right span");
    console.log(userSpan);
    const loginLink = userSpan.querySelector("a.login-link");
    console.log(loginLink);
    if (loginLink) {
        const switcher = userSpan.querySelector("#RESAccountSwitcherIcon");
        switcher.click();
        const inter = setInterval(function () {
            console.log("Interval");
            const accountItem = document.querySelector(".RESHover.RESHoverDropdownList ul li");
            if (accountItem) {
                console.log("Account item: ");
                console.log(accountItem);
                accountItem.click();
                clearInterval(inter);
            }
        }, 20);
    }
}
const main = () => {
    console.log("Start of main");
    const sidebar = document.querySelector(".side");
    // Get rid of the useless "()" being displayed
    const user = document.querySelector("span.user");
    removeExtraUserInfo(user);
    // Build custom menu
    addCustomMenu();

    const sidebarToggle = document.querySelector("#sidebarToggle");
    // Event listeners for custom menu
    sidebarToggle.addEventListener("click", async (e) => {
        e.preventDefault();
        // Yes we can refactor the animation since it's duplicate code in all 3 event handlers
        e.target.classList.toggle("animateLink", true);
        toggleElement(sidebar);
        applyStrikeThrough(sidebarToggle);
        await timeout(2000);
        e.target.classList.toggle("animateLink", false);
    });
    // Show images by default
    console.log("Clicking show images");
    clickShowImages();
    console.log("Remove sidebar");
    toggleElement(sidebar);
    console.log("End of main");
    // Log me in if i'm not already
    loginUser();
}

GM_addStyle(`
    .fixedSite{
	color: #DE781F !important;
    }
    .trashSite{
        color: #253529 !important;
    }
    .paywall{
        color: #1F85DE !important;
    }
    /* CSS for custom links */
    .strikeThrough{
        text-decoration: line-through;
        color: white !important;
    }
    .animateLink{
        animation-duration: 3s;
        animation-name: fadeIn;
        animation-timing-function: ease;
    }
    /* 
    Email notification when scrolled down
    But only apply it when there is mail
    */
    #NREMailCount[title="new mail!"]{
        display: flex;
        width: 100%;
        min-width: 2rem;
        justify-content: center;
        align-content: center;
        align-items: center;
        color: black;
        font-size: 1.4rem;
        min-height: 1.5rem;
        font-family: Verdana;
    }
    #NREMailCount:hover{
        display: "";
    }
    .linkflairlabel {
        font-size: 2vh;
    }
    /*Move votes to the right*/
    .commentarea .midcol{
        float: right;
    }
    /*Move the text portion of a post to the right to accomodate the wider bars to hide posts*/
    .entry{
        padding-left: 25px;
    }
    /*Increase the size of the collapse comment bars*/
    .res-commentQuickCollapse-toggleCommentsOnClickLeftEdge .commentarea .comment > .entry > .tagline > .expand{
        padding: 10px;
        /*margin-top: 40px;*/
    }
    /*Remove the margin whenever the item is collapsed so we can see the bar again*/
    /*.res-commentQuickCollapse-toggleCommentsOnClickLeftEdge .commentarea .comment > .entry > .tagline > .expand[collapse-reason="commentHidePersistor"]{*/
    /*	margin: 0px !important;*/
    /*}*/
    /* Target the hide button 
        Does nothing for now, but we can think about moving it to somwehere more prominent
    */
    a[data-text='hide']{
    }

    /* Hide author names and show them on hover edit:this is done in the standalone comments script already */ 
    /*div.entry p.tagline > a.author{*/
    /*	color: rgba(0, 0, 0, 0) !important;*/
    /*	transition: color 10s;*/
    /*}*/
    /*div.entry p.tagline > a.author:hover{*/
    /*	color: white;*/
    /*	transition: color 0.1s;*/
    /*}*/

    /*Make the black box behind a video transparent*/
    div.res-expando-box{
        background-color: transparent;
    }




    body,
    #sr-header-area,
    #RESShortcutsEditContainer > *,
    #RESShortcutsEditContainer,
    .debuginfo,
    .content,
    .res-expando-box,
    .top-matter{
        background-color: black !important;
        color: white;
    }

    p.debuginfo ,
    .subbarlink,
    #srDropdownContainer a{
        color: white !important;
    }



    div.nav-buttons{
        display: flex;
        align-items: center;
        justify-content: center;
        height: 10vh;
        width: 100vw;
        margin-top: 20vh;
        margin-bottom: 20vh;
        
    }

    span.next-button,
    span.prev-button{
        margin: 2vh!important;
        padding: 2vh;
    }

    span.next-button a,
    span.prev-button a{
        height: 100%;
        font-size: 8vh;
        background: black !important;
        color: white !important;
        padding: 0.2vw;
    }
    span.next-button a:hover,
    span.prev-button a:hover{
        background: white;
        color: black;
    }

    @keyframes fadeIn {
    from {
        color: black;
        opacity: 0;
    }
    to {
        opacity: 1;
    }
    }
    .happening-now-wrap,
    /* userattrs contains cakeday icon */
    /*.userkarma,*/
    span.score,
    .userattrs,
    span.score-hidden,
    .awardings-bar,
    .listing-chooser,
    .give-gold-button,
    .share,
    .save-button,
    .saveComments,
    .crosspost-button,
    .report-button,
    .footer-parent,
    .presence_circle,
    .infobar-toaster-container,
    #notifications,
    #chat-v2,
    .badge-count
    {
        display: none;
    }
`);

main();