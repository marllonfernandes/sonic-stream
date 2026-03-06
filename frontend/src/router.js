import { createRouter, createWebHistory } from "vue-router";
import LibraryView from "./views/LibraryView.vue";
import CalendarView from "./views/CalendarView.vue";
import EventDetailsView from "./views/EventDetailsView.vue";
import TeamView from "./views/TeamView.vue";
import WishlistView from "./views/WishlistView.vue";

const routes = [
  {
    path: "/",
    name: "library",
    component: LibraryView,
  },
  {
    path: "/calendar",
    name: "calendar",
    component: CalendarView,
  },
  {
    path: "/events/:id",
    name: "event-details",
    component: EventDetailsView,
  },
  {
    path: "/team",
    name: "team",
    component: TeamView,
  },
  {
    path: "/wishlist",
    name: "wishlist",
    component: WishlistView,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
