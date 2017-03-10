var menuToggle = false;

function changeStatus() {
	menuToggle = !menuToggle;
	if (menuToggle) {
		$(".jumbotron").addClass("jumbotronFade");
	} else {
		$(".jumbotron").removeClass("jumbotronFade")
	}
}


// var navbarToggle = false;
// function navbarChange_v1() {
// 	$(".navbar").removeClass("alt-navbar")
// }

// function navbarChange_v2() {
// 	$(".navbar").addClass("alt-navbar")
// }