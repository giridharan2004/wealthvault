<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { family, familyCode, familyMembers, createFamily, joinFamily, loadFamily } from '$lib/stores/family';
  import { user } from '$lib/stores/auth';

  let mode = $state<'none' | 'create' | 'join'>('none');
  let familyName = $state('');
  let memberName = $state('');
  let joinCode = $state('');
  let loading = $state(false);
  let error = $state('');
  let copied = $state(false);
  let pageReady = $state(false);

  onMount(async () => {
    await loadFamily();
    pageReady = true;
  });

  async function handleCreate() {
    if (!familyName || !memberName) return;
    loading = true; error = '';
    try {
      await createFamily(familyName, memberName);
      await loadFamily();
      goto('/dashboard');
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  async function handleJoin() {
    if (!joinCode || !memberName) return;
    loading = true; error = '';
    try {
      await joinFamily(joinCode, memberName);
      await loadFamily();
      goto('/dashboard');
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  async function copyCode() {
    if ($familyCode) {
      await navigator.clipboard.writeText($familyCode);
      copied = true;
      setTimeout(() => copied = false, 2000);
    }
  }
</script>

{#if !pageReady}
  <div class="flex items-center justify-center py-32">
    <div class="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
  </div>

{:else if $family}
  <div class="max-w-lg mx-auto space-y-4 px-4 py-6">
    <div class="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
          {$family.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 class="text-gray-900 font-bold text-xl">{$family.name}</h1>
          <p class="text-gray-400 text-sm">{$familyMembers.length} member{$familyMembers.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
    </div>
    <div class="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
      <p class="text-gray-900 font-semibold mb-1">Family Code</p>
      <p class="text-gray-400 text-sm mb-4">Share this code to invite family members</p>
      <div class="bg-gray-50 rounded-2xl p-4 flex items-center justify-between gap-3">
        <span class="font-mono text-emerald-500 text-2xl font-bold tracking-widest">{$familyCode}</span>
        <button onclick={copyCode}
          class="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-2xl transition">
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
    <div class="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
      <p class="text-gray-900 font-semibold mb-4">Members ({$familyMembers.length})</p>
      <div class="space-y-3">
        {#each $familyMembers as member}
          <div class="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
            <div class="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {member.displayName.charAt(0).toUpperCase()}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-gray-900 text-sm font-semibold truncate">{member.displayName}</p>
              <p class="text-gray-400 text-xs truncate">{member.email}</p>
            </div>
            {#if member.uid === $user?.uid}
              <span class="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">You</span>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </div>

{:else}
  <div class="max-w-md mx-auto px-4 py-6">
    <div class="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
      <h1 class="text-gray-900 font-bold text-xl mb-1">Family Group</h1>
      <p class="text-gray-400 text-sm mb-6">Create a new family group or join one with an invite code.</p>
      {#if mode === 'none'}
        <div class="flex gap-3">
          <button onclick={() => mode = 'create'}
            class="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-2xl transition">
            Create Family
          </button>
          <button onclick={() => mode = 'join'}
            class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-2xl transition">
            Join with Code
          </button>
        </div>
      {:else if mode === 'create'}
        <div class="space-y-3">
          <div>
            <label for="memberName1" class="text-gray-700 text-sm font-medium block mb-1">Your Name</label>
            <input id="memberName1" type="text" bind:value={memberName} placeholder="e.g. Giri"
              class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-900 text-sm focus:border-emerald-500 focus:outline-none"/>
          </div>
          <div>
            <label for="familyName" class="text-gray-700 text-sm font-medium block mb-1">Family Name</label>
            <input id="familyName" type="text" bind:value={familyName} placeholder="e.g. Giri Family"
              class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-900 text-sm focus:border-emerald-500 focus:outline-none"/>
          </div>
          {#if error}<p class="text-red-500 text-xs">{error}</p>{/if}
          <div class="flex gap-3 pt-2">
            <button onclick={() => mode = 'none'}
              class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-2xl transition">Back</button>
            <button onclick={handleCreate} disabled={loading}
              class="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-2xl transition disabled:opacity-50">
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      {:else if mode === 'join'}
        <div class="space-y-3">
          <div>
            <label for="memberName2" class="text-gray-700 text-sm font-medium block mb-1">Your Name</label>
            <input id="memberName2" type="text" bind:value={memberName} placeholder="e.g. Suruthi"
              class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-900 text-sm focus:border-emerald-500 focus:outline-none"/>
          </div>
          <div>
            <label for="joinCode" class="text-gray-700 text-sm font-medium block mb-1">Family Code</label>
            <input id="joinCode" type="text" bind:value={joinCode} placeholder="e.g. 92ERE4"
              class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-900 text-sm focus:border-emerald-500 focus:outline-none uppercase"/>
          </div>
          {#if error}<p class="text-red-500 text-xs">{error}</p>{/if}
          <div class="flex gap-3 pt-2">
            <button onclick={() => mode = 'none'}
              class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-2xl transition">Back</button>
            <button onclick={handleJoin} disabled={loading}
              class="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-2xl transition disabled:opacity-50">
              {loading ? 'Joining...' : 'Join'}
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}