<script lang="ts">
import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import { user } from '$lib/stores/auth';
import { loadFamily, createFamily, joinFamily } from '$lib/stores/family';

let step = $state<'loading' | 'setup' | 'done'>('loading');
let mode = $state<'create' | 'join'>('create');
let familyName = $state('');
let displayName = $state('');
let inviteCode = $state('');
let error = $state('');
let submitting = $state(false);

onMount(async () => {
const f = await loadFamily();
if (f) {
goto('/');
} else {
displayName = $user?.displayName || '';
step = 'setup';
}
});

async function handleSubmit() {
error = '';
submitting = true;
try {
const photoURL = $user?.photoURL || '';
if (mode === 'create') {
if (!familyName.trim() || !displayName.trim()) {
error = 'Please fill in all fields';
return;
}
await createFamily(familyName.trim(), displayName.trim(), photoURL);
} else {
if (!inviteCode.trim() || !displayName.trim()) {
error = 'Please fill in all fields';
return;
}
await joinFamily(inviteCode.trim().toUpperCase(), displayName.trim(), photoURL);
}
await loadFamily();
goto('/');
} catch (e: any) {
error = e.message;
} finally {
submitting = false;
}
}
</script>

<div class="min-h-screen bg-gray-950 flex items-center justify-center px-4">
{#if step === 'loading'}
<div class="text-center">
<div class="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
<p class="text-gray-400">Loading...</p>
</div>
{:else}
<div class="bg-gray-900 border border-gray-800 rounded-2xl p-10 w-full max-w-md">
<h1 class="text-2xl font-bold text-emerald-400 mb-2">Set Up Your Family</h1>
<p class="text-gray-400 text-sm mb-8">Create a new family group or join an existing one with an invite code.</p>

<div class="flex bg-gray-800 rounded-xl p-1 mb-8">
<button
onclick={() => (mode = 'create')}
class="flex-1 py-2 rounded-lg text-sm font-medium transition {mode === 'create' ? 'bg-emerald-500 text-black' : 'text-gray-400 hover:text-white'}"
>Create Family</button>
<button
onclick={() => (mode = 'join')}
class="flex-1 py-2 rounded-lg text-sm font-medium transition {mode === 'join' ? 'bg-emerald-500 text-black' : 'text-gray-400 hover:text-white'}"
>Join Family</button>
</div>

<div class="space-y-4">
<div>
<label class="block text-sm text-gray-400 mb-1">Your Name</label>
<input
bind:value={displayName}
placeholder="e.g. Dad, Mom, Giri..."
class="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
/>
</div>
{#if mode === 'create'}
<div>
<label class="block text-sm text-gray-400 mb-1">Family Name</label>
<input
bind:value={familyName}
placeholder="e.g. Giri Family"
class="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
/>
</div>
{:else}
<div>
<label class="block text-sm text-gray-400 mb-1">Invite Code</label>
<input
bind:value={inviteCode}
placeholder="FAMILY-XXXXXX"
class="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 uppercase tracking-widest"
/>
</div>
{/if}
</div>

{#if error}
<p class="text-red-400 text-sm mt-4">{error}</p>
{/if}

<button
onclick={handleSubmit}
disabled={submitting}
class="w-full mt-6 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-semibold py-3 rounded-xl transition"
>{submitting ? 'Please wait...' : mode === 'create' ? 'Create Family' : 'Join Family'}</button>
</div>
{/if}
</div>
