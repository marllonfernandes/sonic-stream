import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import PrimeVue from "primevue/config";
import Aura from "@primevue/themes/aura";
import "primeicons/primeicons.css";

import ConfirmationService from "primevue/confirmationservice";
import vue3GoogleLogin from "vue3-google-login";

import { polyfill } from "mobile-drag-drop";
import "mobile-drag-drop/default.css";

// Polyfill for mobile drag and drop
polyfill({
  holdToDrag: 300, // require holding for 300ms to start drag
});

// Polyfill requires passive: false for touchmove
window.addEventListener("touchmove", function () {}, { passive: false });

const app = createApp(App);
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: ".dark",
    },
  },
});
app.use(ConfirmationService);

app.use(vue3GoogleLogin, {
  clientId:
    "1094295943535-k6dmt5i8mmc114ccod72sp150gpuf33j.apps.googleusercontent.com",
});

app.mount("#app");
