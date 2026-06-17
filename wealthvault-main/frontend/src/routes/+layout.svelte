<script lang="ts">
  import '../app.css';
  import { user, loading, logout } from '$lib/stores/auth';
  import { family, loadFamily, selectedMember } from '$lib/stores/family';
  import type { FamilyMember } from '$lib/stores/family';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';

  let { children } = $props();

  const avatarColors = [
    'bg-emerald-500','bg-blue-500','bg-purple-500',
    'bg-orange-500','bg-pink-500','bg-yellow-500'
  ];

  function colorFor(i: number) { return avatarColors[i % avatarColors.length]; }

  function initials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  function selectMember(member: FamilyMember) { selectedMember.set(member); }
  function clearMember() { selectedMember.set(null); }

  const navLinks = [
    { href: '/dashboard', label: 'Home',   icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { href: '/stocks',    label: 'Stocks', icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z' }
  ];

  $effect(() => {
    if (browser && !$loading && !$user && $page.url.pathname !== '/login') goto('/login');
  });

  $effect(() => {
    if (browser && $user && !$loading) {
      loadFamily().then(f => {
        if (!f && $page.url.pathname !== '/family' && $page.url.pathname !== '/login') goto('/family');
      });
    }
  });

  const currentPath = $derived($page.url.pathname);
</script>

{#if $loading}
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center">
      <div class="w-14 h-14 rounded-3xl bg-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-sm">
        <span class="text-white font-bold text-2xl">W</span>
      </div>
      <div class="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p class="text-gray-400 text-sm">Loading WealthVault...</p>
    </div>
  </div>

{:else if !$user && $page.url.pathname !== '/login'}
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <p class="text-gray-400">Redirecting...</p>
  </div>

{:else if $page.url.pathname === '/login' || $page.url.pathname === '/family'}
  <div class="min-h-screen bg-gray-50">
    {@render children()}
  </div>

{:else if $user && $family && !$selectedMember}
  <!-- Profile selector -->
  <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
    <div class="flex items-center gap-3 mb-10">
      <div class="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-sm">
        <span class="text-white font-bold text-xl">W</span>
      </div>
      <span class="text-2xl font-bold text-gray-900">WealthVault</span>
    </div>

    <h1 class="text-2xl font-bold text-gray-900 mb-1">Who's viewing?</h1>
    <p class="text-gray-400 text-sm mb-10">{$family.name}</p>

    <div class="flex flex-wrap justify-center gap-4 max-w-lg">
      {#each $family.members as member, i}
        <button
          onclick={() => selectMember(member)}
          class="group flex flex-col items-center gap-3 p-5 bg-white rounded-3xl shadow-sm hover:shadow-md border border-gray-100 hover:border-emerald-200 transition w-36"
        >
          <div class="w-16 h-16 rounded-full {colorFor(i)} flex items-center justify-center text-xl font-bold text-white group-hover:ring-4 group-hover:ring-emerald-200 transition overflow-hidden shadow-sm">
            {#if member.photoURL}
              <img src={member.photoURL} alt={member.displayName} class="w-full h-full object-cover rounded-full"/>
            {:else}
              {initials(member.displayName)}
            {/if}
          </div>
          <span class="text-gray-800 font-semibold text-sm">{member.displayName}</span>
          {#if member.role === 'admin'}
            <span class="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">Admin</span>
          {/if}
        </button>
      {/each}
    </div>

    {#each $family.members as member}
      {#if member.uid === $user?.uid && member.role === 'admin'}
        <div class="mt-10 bg-white border border-gray-100 rounded-3xl px-6 py-4 text-center shadow-sm">
          <p class="text-gray-400 text-xs mb-1">Invite code — share with family</p>
          <p class="text-emerald-600 font-mono font-bold text-xl tracking-widest">{$family.inviteCode}</p>
        </div>
      {/if}
    {/each}

    <button onclick={logout} class="mt-8 text-sm text-gray-400 hover:text-gray-600 transition">Sign Out</button>
  </div>

{:else if $user && $family && $selectedMember}
  <!-- ── Main App Shell ── -->
  <div class="min-h-screen bg-gray-50">

    <!-- Desktop top nav -->
    <nav class="hidden md:flex bg-white border-b border-gray-100 px-6 py-3 sticky top-0 z-30">
      <div class="max-w-7xl mx-auto w-full flex items-center justify-between">
        <div class="flex items-center gap-6">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center">
              <span class="text-white font-bold text-sm">W</span>
            </div>
            <span class="text-gray-900 font-bold text-lg">WealthVault</span>
          </div>
          <div class="flex gap-1 text-sm">
            {#each navLinks as link}
              <a href={link.href}
                class="px-4 py-2 rounded-2xl font-medium transition
                  {currentPath === link.href
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'}"
              >{link.label}</a>
            {/each}
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button
            onclick={clearMember}
            class="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-2xl transition"
          >
            <div class="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white">
              {initials($selectedMember.displayName)}
            </div>
            <span class="text-sm text-gray-700 font-medium">{$selectedMember.displayName}</span>
            <svg class="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          <button onclick={logout}
            class="text-sm bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-500 px-4 py-2 rounded-2xl transition font-medium">
            Sign Out
          </button>
        </div>
      </div>
    </nav>

    <!-- Mobile top header -->
    <header class="md:hidden bg-white px-4 pt-12 pb-4 sticky top-0 z-30 border-b border-gray-50">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-gray-400 text-xs">Welcome back 👋</p>
          <p class="text-gray-900 font-bold text-lg">{$selectedMember.displayName}</p>
        </div>
        <div class="flex items-center gap-2">
          <button
            onclick={clearMember}
            class="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-sm font-bold text-white shadow-sm"
          >
            {initials($selectedMember.displayName)}
          </button>
          <button onclick={logout}
            class="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center">
            <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Page content -->
    <main class="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8 pb-24 md:pb-8">
      {@render children()}
    </main>

    <!-- Mobile bottom nav -->
    <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe z-30 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
      <div class="flex items-center justify-around px-2 pt-2 pb-2">
        {#each navLinks as link}
          <a href={link.href}
            class="flex flex-col items-center gap-0.5 px-3 py-1 rounded-2xl transition min-w-[56px]
              {currentPath === link.href ? 'text-emerald-600' : 'text-gray-400'}"
          >
            <div class="p-2 rounded-2xl transition {currentPath === link.href ? 'bg-emerald-50' : ''}">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d={link.icon}/>
              </svg>
            </div>
            <span class="text-xs font-medium">{link.label}</span>
          </a>
        {/each}
      </div>
    </nav>

  </div>

{:else}
  <div class="min-h-screen bg-gray-50">
    {@render children()}
  </div>
{/if}