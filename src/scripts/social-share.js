document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll("[data-share]").forEach(function (element) {
    element.addEventListener("click", function (e) {
      e.preventDefault(); // Prevent default anchor behavior
      const shareType = this.getAttribute("data-share");
      const url = window.location.href;
      const title = document.title;
      const mailSubject = encodeURIComponent(title);
      const mailBody = encodeURIComponent(url);

      switch (shareType) {
        case "linkedin":
          window.open(
            `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
            "_blank",
          );
          break;
        case "twitter":
          window.open(
            `https://twitter.com/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
            "_blank",
          );
          break;
        case "facebook":
          window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
            "_blank",
          );
          break;
        case "mail":
          window.open(
            `mailto:?subject=${mailSubject}&body=${mailBody}`,
            "_self",
          );
          break;
        case "copy":
          navigator.clipboard
            .writeText(url)
            .then(() => {
              alert("URL copied to clipboard!");
            })
            .catch((err) => {
              console.error("Error in copying text: ", err);
            });
          break;
        default:
          console.log("No action defined for this share type.");
      }
    });
  });
});
