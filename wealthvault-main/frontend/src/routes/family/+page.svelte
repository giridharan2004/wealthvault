<script lang="ts">
  import { onMount } from 'svelte';
  import { family, familyCode, familyMembers, createFamily, joinFamily, loadFamily } from '$lib/stores/family';
  import { user } from '$lib/stores/auth';

  let mode: 'none' | 'create' | 'join' = 'none';
  let familyName = '';
  let memberName = '';
  let joinCode = '';
  let loading = false;
  let error = '';
  let copied = false;

  onMount(async () => {
    await loadFamily();
  });

  async function handleCreate() {
    if (!familyName || !memberName) return;
    loading = true; error = '';
    try {
      await createFamily(familyName, memberName);
      await loadFamily();
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

<div class="max-w-lg mx-auto space-y-6">
  <h1 class="text-2xl font-bold text-white">Family</h1>

  {#if $family}
    <div class="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
      <div>
        <p class="text-gray-400 text-sm">Family Name</p>
        <p class="text-white font-bold text-xl">{$family.name}</p>
      </div>
      <div>
        <p class="text-gray-400 text-sm mb-2">Family Code — share this to invite members</p>
        <div class="flex items-center gap-3">
          <div class="bg-gray-800 rounded-lg px-4 py-3 text-emerald-400 font-mono text-xl font-bold tracking-widest flex-1 text-center">
            {$familyCode}
          </div>
          <button on:click={copyCode}
            class="bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg transition text-sm">
            {copied ? '? Copied' : 'Copy'}
          </button>
        </div>
      </div>
      <div>
        <p class="text-gray-400 text-sm mb-3">Members ({$familyMembers.length})</p>
        <div class="space-y-2">
          {#each $familyMembers as member}
            <div class="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-3">
              <div class="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-black font-bold text-sm">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p class="text-white text-sm font-medium">{member.name}</p>
                <p class="text-gray-500 text-xs">{member.email}</p>
              </div>
              {#if member.uid === $user?.uid}
                <span class="ml-auto text-xs text-emerald-400">You</span>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </div>

  {:else}
    <div class="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <p class="text-gray-400 mb-6 text-sm">You are not part of a family group yet.</p>

      {#if mode === 'none'}
        <div class="flex gap-3">
          <button on:click={() => mode = 'create'}
            class="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold py-3 rounded-xl transition">
            Create Family
          </button>
          <button on:click={() => mode = 'join'}
            class="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-xl transition">
            Join with Code
          </button>
        </div>

      {:else if mode === 'create'}
        <div class="space-y-3">
          <div>
            <label class="text-gray-400 text-xs block mb-1">Your Name</label>
            <input type="text" bind:value={memberName} placeholder="e.g. Giri"
              class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none"/>
          </div>
          <div>
            <label class="text-gray-400 text-xs block mb-1">Family Name</label>
            <input type="text" bind:value={familyName} placeholder="e.g. Giri Family"
              class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none"/>
          </div>
          {#if error}<p class="text-red-400 text-xs">{error}</p>{/if}
          <div class="flex gap-3 pt-2">
            <button on:click={() => mode = 'none'}
              class="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-xl transition">Back</button>
            <button on:click={handleCreate} disabled={loading}
              class="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold py-2 rounded-xl transition disabled:opacity-50">
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>

      {:else if mode === 'join'}
        <div class="space-y-3">
          <div>
            <label class="text-gray-400 text-xs block mb-1">Your Name</label>
            <input type="text" bind:value={memberName} placeholder="e.g. Dad"
              class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none"/>
          </div>
          <div>
            <label class="text-gray-400 text-xs block mb-1">Family Code</label>
            <input type="text" bind:value={joinCode} placeholder="e.g. ABC123"
              class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none uppercase"/>
          </div>
          {#if error}<p class="text-red-400 text-xs">{error}</p>{/if}
          <div class="flex gap-3 pt-2">
            <button on:click={() => mode = 'none'}
              class="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-xl transition">Back</button>
            <button on:click={handleJoin} disabled={loading}
              class="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold py-2 rounded-xl transition disabled:opacity-50">
              {loading ? 'Joining...' : 'Join'}
            </button>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
