<script lang="ts">
  import { signInWithGoogle } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { user } from '$lib/stores/auth';

  $effect(() => {
    if ($user) goto('/dashboard');
  });

  let error = $state('');
  let signingIn = $state(false);

  async function handleGoogleSignIn() {
    signingIn = true;
    error = '';
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error('Sign in error:', e);
      error = 'Sign in failed. Please try again.';
      signingIn = false;
    }
  }
</script>

<div class="min-h-screen bg-gray-950 flex items-center justify-center">
  <div class="bg-gray-900 border border-gray-800 rounded-2xl p-10 w-full max-w-md text-center">
    <div class="mb-8">
      <h1 class="text-4xl font-bold text-emerald-400 mb-2">WealthVault</h1>
      <p class="text-gray-400">Your complete Indian portfolio tracker</p>
    </div>
    <div class="space-y-3 text-left mb-8">
      {#each ['Stocks (NSE/BSE)', 'Mutual Funds (SIP + XIRR)', 'Gold (MCX rates)', 'Property & FD', 'LTCG Tax Calculator'] as feature}
        <div class="flex items-center gap-3 text-sm text-gray-300">
          <span class="text-emerald-400">✓</span>
          {feature}
        </div>
      {/each}
    </div>
    {#if error}
      <p class="text-red-400 text-sm mb-4">{error}</p>
    {/if}
    <button
      onclick={handleGoogleSignIn}
      disabled={signingIn}
      class="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-semibold py-3 px-6 rounded-xl transition flex items-center justify-center gap-3"
    >
      {#if signingIn}
        <div class="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
        Signing in...
      {:else}
        Continue with Google
      {/if}
    </button>
    <p class="text-xs text-gray-600 mt-6">Your data is encrypted and stored securely in Firebase</p>
  </div>
</div>
