<script lang="ts">
  import { goto } from '$app/navigation';
  import { user } from '$lib/stores/auth';

  // If already logged in, go to dashboard
  $: if ($user) goto('/dashboard');
</script>

<div class="min-h-screen bg-gray-950 text-white">

  <!-- Navbar -->
  <nav class="flex items-center justify-between px-8 py-5 border-b border-gray-900">
    <span class="text-emerald-400 font-bold text-xl tracking-tight">WealthVault</span>
    
      href="/login"
      class="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-5 py-2 rounded-xl transition text-sm"
    >
      Sign In
    </a>
  </nav>

  <!-- Hero -->
  <section class="max-w-4xl mx-auto px-8 pt-24 pb-16 text-center">
    <div class="inline-block bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium px-4 py-1.5 rounded-full mb-6">
      Built for Indian Investors
    </div>
    <h1 class="text-5xl font-bold text-white leading-tight mb-6">
      Track your family's<br/>
      <span class="text-emerald-400">wealth in one place</span>
    </h1>
    <p class="text-gray-400 text-lg max-w-xl mx-auto mb-10">
      Stocks, Mutual Funds, Gold, Property — all your assets tracked with
      live prices, XIRR returns, and India-specific tax calculations.
    </p>
    <div class="flex items-center justify-center gap-4">
      
        href="/login"
        class="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-8 py-3.5 rounded-xl transition text-base"
      >
        Get Started Free
      </a>
      
        href="#features"
        class="text-gray-400 hover:text-white transition text-sm"
      >
        See features ↓
      </a>
    </div>
  </section>

  <!-- Stats -->
  <section class="max-w-4xl mx-auto px-8 pb-16">
    <div class="grid grid-cols-3 gap-4">
      {#each [
        { label: 'Asset Classes', value: '6+' },
        { label: 'Family Members', value: '∞' },
        { label: 'Tax Rules', value: 'Budget 2024' }
      ] as stat}
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
          <p class="text-2xl font-bold text-emerald-400">{stat.value}</p>
          <p class="text-gray-400 text-sm mt-1">{stat.label}</p>
        </div>
      {/each}
    </div>
  </section>

  <!-- Features -->
  <section id="features" class="max-w-4xl mx-auto px-8 pb-24">
    <h2 class="text-2xl font-bold text-white text-center mb-10">Everything you need</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      {#each [
        {
          icon: '📈',
          title: 'Stock Portfolio',
          desc: 'Track NSE/BSE stocks with live prices, P&L, stop loss, target alerts and sell tracking per family member.'
        },
        {
          icon: '🏦',
          title: 'Mutual Funds',
          desc: 'SIP tracker with XIRR calculation. Live NAV from mfapi.in — free, no API key needed.'
        },
        {
          icon: '🪙',
          title: 'Gold Tracker',
          desc: 'Track gold by grams and purity. Live MCX rates with INR per gram calculation.'
        },
        {
          icon: '🏠',
          title: 'Property',
          desc: 'Manual property valuation with rental yield tracking and appreciation over time.'
        },
        {
          icon: '👨‍👩‍👧‍👦',
          title: 'Family Portfolios',
          desc: 'Each member has their own login. Join with a family code to view combined family wealth.'
        },
        {
          icon: '🧮',
          title: 'Tax Calculator',
          desc: 'LTCG/STCG calculation per Budget 2024 rules for equity, debt, gold and property.'
        }
      ] as feature}
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-5 flex gap-4">
          <span class="text-2xl">{feature.icon}</span>
          <div>
            <h3 class="text-white font-semibold mb-1">{feature.title}</h3>
            <p class="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- Footer -->
  <footer class="border-t border-gray-900 px-8 py-6 text-center">
    <p class="text-gray-600 text-sm">WealthVault — Built for Indian families 🇮🇳</p>
  </footer>

</div>