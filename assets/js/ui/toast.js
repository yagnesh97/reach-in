// Toast notification system
const TOAST_ICONS = {
  success: Icons.success,
  error: Icons.error,
  warning: Icons.warning,
  info: Icons.info,
};

const TOAST_DURATION = 3000;

function showToast(message, type = "info") {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", "status");

  const iconName = TOAST_ICONS[type] || Icons.info;
  const iconWrapper = document.createElement("span");
  iconWrapper.className = "toast-icon";
  iconWrapper.appendChild(renderIcon(iconName));
  toast.appendChild(iconWrapper);

  const text = document.createElement("span");
  text.className = "toast-message";
  text.textContent = message;
  toast.appendChild(text);

  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("toast-visible"));

  setTimeout(() => {
    toast.classList.remove("toast-visible");
    toast.classList.add("toast-hiding");
    setTimeout(() => toast.remove(), 200);
  }, TOAST_DURATION);
}
