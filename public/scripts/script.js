var menuToggle = false;

function changeStatus() {
	menuToggle = !menuToggle;
	if (menuToggle) {
		$(".jumbotron").addClass("jumbotronFade");
	} else {
		$(".jumbotron").removeClass("jumbotronFade")
	}
}
