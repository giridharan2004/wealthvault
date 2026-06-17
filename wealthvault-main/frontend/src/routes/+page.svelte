<script lang="ts">
  import { goto } from '$app/navigation';
  import { user } from '$lib/stores/auth';

  $effect(() => {
    if ($user) goto('/dashboard');
  });
</script>

<div class="min-h-screen bg-gray-50 flex items-center justify-center">
  <div class="text-center px-6">
    <div class="w-16 h-16 rounded-3xl bg-emerald-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-200">
      <span class="text-white font-bold text-2xl">W</span>
    </div>
    <h1 class="text-3xl font-bold text-gray-900 mb-2">WealthVault</h1>
    <p class="text-gray-400 mb-8">Family portfolio tracker for Indian families</p>
    <a href="/login"
      class="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-3 rounded-2xl transition">
      Sign In
    </a>
  </div>
</div>