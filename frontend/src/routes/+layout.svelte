<script lang="ts">
  import '../app.css';
  import { user, loading, logout } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';

  let { children } = $props();

  $effect(() => {
    if (browser && !$loading && !$user && $page.url.pathname !== '/login') {
      goto('/login');
    }
  });
</script>

{#if $loading}
  <div class="min-h-screen bg-gray-950 flex items-center justify-center">
    <div class="text-center">
      <div class="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p class="text-gray-400">Loading WealthVault...</p>
    </div>
  </div>
{:else if !$user && $page.url.pathname !== '/login'}
  <div class="min-h-screen bg-gray-950 flex items-center justify-center">
    <p class="text-gray-400">Redirecting...</p>
  </div>
{:else}
  <div class="min-h-screen bg-gray-950 text-white">
    {#if $user}
    <nav class="bg-gray-900 border-b border-gray-800 px-6 py-4">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-8">
          <span class="text-emerald-400 font-bold text-xl">WealthVault</span>
          <div class="flex gap-6 text-sm">
            <a href="/dashboard" class="text-gray-300 hover:text-white transition">Dashboard</a>
            <a href="/stocks" class="text-gray-300 hover:text-white transition">Stocks</a>
            <a href="/mutualfunds" class="text-gray-300 hover:text-white transition">Mutual Funds</a>
            <a href="/gold" class="text-gray-300 hover:text-white transition">Gold</a>
            <a href="/property" class="text-gray-300 hover:text-white transition">Property</a>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <span class="text-sm text-gray-400">{$user.email}</span>
          <button onclick={logout} class="text-sm bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition">
            Sign Out
          </button>
        </div>
      </div>
    </nav>
    {/if}
    <main class="max-w-7xl mx-auto px-6 py-8">
      {@render children()}
    </main>
  </div>
{/if}
