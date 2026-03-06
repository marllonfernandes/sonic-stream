<script setup>
  import { ref, onMounted } from 'vue';
  import { decodeCredential, GoogleLogin } from 'vue3-google-login';
  import Button from 'primevue/button';
  import Menu from 'primevue/menu';
  import SettingsDialog from './components/SettingsDialog.vue';
  
  const settingsRef = ref(null);
  const user = ref(null);
  const menuRef = ref(null);
  
  const menuItems = ref([
      { label: 'Library', icon: 'pi pi-music', route: '/' },
      { label: 'Wishlist', icon: 'pi pi-bookmark', route: '/wishlist' },
      { label: 'Calendar', icon: 'pi pi-calendar', route: '/calendar' },
      { label: 'Team', icon: 'pi pi-users', route: '/team' }
  ]);
  
  const toggleMenu = (event) => {
      menuRef.value.toggle(event);
  };
  
  const callback = (response) => {
    const userData = decodeCredential(response.credential);
    user.value = userData;
    localStorage.setItem('user', JSON.stringify(userData));
  };
  
  const logout = () => {
      user.value = null;
      localStorage.removeItem('user');
  };
  
  onMounted(() => {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
          try {
              user.value = JSON.parse(savedUser);
          } catch (e) {}
      }
  });
  </script>

<template>
    <div v-if="!user" class="h-screen w-screen bg-moises-bg flex flex-col items-center justify-center text-white font-sans p-6">
        <div class="mb-8 text-center">
            <div class="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-moises-accent to-purple-600 flex items-center justify-center shadow-lg shadow-moises-accent/20">
                <i class="pi pi-wave-pulse text-white text-3xl"></i>
            </div>
            <h1 class="text-3xl font-bold tracking-tight mb-2">SonicStream</h1>
            <p class="text-moises-secondary">Sign in to access your audio library</p>
        </div>
        
        <div class="bg-moises-surface/50 p-8 rounded-2xl border border-moises-border shadow-xl w-full max-w-sm flex items-center justify-center">
            <GoogleLogin :callback="callback" prompt />
        </div>
    </div>

    <div v-else class="h-screen w-screen bg-moises-bg text-moises-text flex flex-col overflow-hidden relative font-sans">
        <!-- Top Bar -->
        <header
            class="h-16 flex items-center justify-between px-6 border-b border-moises-border bg-moises-surface/50 backdrop-blur-md z-10 shrink-0">
            <div class="flex items-center gap-3">
                <div
                    class="w-8 h-8 rounded-lg bg-gradient-to-br from-moises-accent to-purple-600 flex items-center justify-center shadow-lg shadow-moises-accent/20">
                    <i class="pi pi-wave-pulse text-white text-lg"></i>
                </div>
                <h1 class="font-bold text-xl tracking-tight hidden sm:block mr-2">SonicStream</h1>
                
                <div class="h-6 w-px bg-moises-border/50 mx-1 hidden sm:block"></div>
                <!-- Navigation Tabs (Desktop) -->
                <div class="hidden md:flex items-center gap-2">
                    <router-link to="/" class="text-moises-secondary hover:text-white px-3 py-1 rounded transition-colors font-medium text-sm" active-class="text-white bg-moises-surface shadow-sm">Library</router-link>
                    <router-link to="/wishlist" class="text-moises-secondary hover:text-white px-3 py-1 rounded transition-colors font-medium text-sm" active-class="text-white bg-moises-surface shadow-sm">Wishlist</router-link>
                    <router-link to="/calendar" class="text-moises-secondary hover:text-white px-3 py-1 rounded transition-colors font-medium text-sm" active-class="text-white bg-moises-surface shadow-sm">Calendar</router-link>
                    <router-link to="/team" class="text-moises-secondary hover:text-white px-3 py-1 rounded transition-colors font-medium text-sm" active-class="text-white bg-moises-surface shadow-sm">Team</router-link>
                </div>

                <!-- Navigation Tabs (Mobile) -->
                <div class="md:hidden flex items-center">
                    <Button icon="pi pi-bars" text rounded class="text-moises-secondary hover:text-white w-10 h-10 p-0" @click="toggleMenu" aria-haspopup="true" aria-controls="mobile_nav_menu" />
                    <Menu ref="menuRef" id="mobile_nav_menu" :model="menuItems" :popup="true">
                        <template #item="{ item, props }">
                            <router-link v-if="item.route" v-slot="{ href, navigate, isActive }" :to="item.route" custom>
                                <a :href="href" @click="(e) => { navigate(e); menuRef.toggle(e); }" class="flex items-center gap-3 px-4 py-3 rounded text-sm transition-colors" :class="isActive ? 'text-white bg-moises-surface font-semibold' : 'text-gray-400 hover:text-white hover:bg-moises-surface'">
                                    <span :class="item.icon"></span>
                                    <span>{{ item.label }}</span>
                                </a>
                            </router-link>
                        </template>
                    </Menu>
                </div>
            </div>
            <div class="flex items-center gap-2 sm:gap-4">
                <div class="flex items-center gap-2" v-if="user">
                    <img v-if="user.picture" :src="user.picture" class="w-8 h-8 rounded-full border border-moises-border shadow-sm hidden sm:block" />
                    <span class="text-sm font-medium hidden md:block text-gray-200">{{ user.name }}</span>
                </div>
                <div class="h-6 w-px bg-moises-border/50 mx-1"></div>
                <Button icon="pi pi-sign-out" text rounded class="text-moises-secondary hover:text-red-400 transition-colors w-10 h-10 p-0"
                    title="Sign Out" @click="logout" />
                <Button icon="pi pi-cog" text rounded class="text-moises-secondary hover:text-white transition-colors w-10 h-10 p-0"
                    title="Settings" @click="settingsRef.open()" />
            </div>
        </header>

        <!-- Main Content Area (Scrollable) -->
        <!-- Main Content Area (Router View) -->
        <main class="flex-1 overflow-y-auto overflow-x-hidden relative h-full">
            <router-view></router-view>
        </main>

        <SettingsDialog ref="settingsRef" />
    </div>
</template>

<style scoped>
/* No scoped styles needed, using utility classes */
</style>
