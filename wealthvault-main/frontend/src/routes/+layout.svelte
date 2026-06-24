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
		'bg-emerald-500',
		'bg-blue-500',
		'bg-purple-500',
		'bg-orange-500',
		'bg-pink-500',
		'bg-yellow-500'
	];

	function colorFor(i: number) {
		return avatarColors[i % avatarColors.length];
	}
	function initials(name: string) {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}
	function selectMember(member: FamilyMember) {
		selectedMember.set(member);
	}
	function clearMember() {
		selectedMember.set(null);
	}

	const navLinks = [
		{
			href: '/dashboard',
			label: 'Home',
			icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
		},
		{
			href: '/stocks',
			label: 'Stocks',
			icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z'
		}
	];

	$effect(() => {
		if (browser && !$loading && !$user && $page.url.pathname !== '/login') goto('/login');
	});

	$effect(() => {
		if (browser && $user && !$loading) {
			loadFamily().then((f) => {
				if (!f && $page.url.pathname !== '/family' && $page.url.pathname !== '/login')
					goto('/family');
			});
		}
	});

	const currentPath = $derived($page.url.pathname);
</script>

{#if $loading}
	<div class="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
		<div class="text-center">
			<div
				class="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20"
			>
				<span class="text-white font-bold text-xl">W</span>
			</div>
			<div
				class="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"
			></div>
			<p class="text-white/40 text-xs">Loading WealthVault...</p>
		</div>
	</div>
{:else if !$user && $page.url.pathname !== '/login'}
	<div class="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
		<p class="text-white/40 text-sm">Redirecting...</p>
	</div>
{:else if $page.url.pathname === '/login' || $page.url.pathname === '/family'}
	<div class="min-h-screen bg-[#0a0a0a]">
		{@render children()}
	</div>
{:else if $user && $family && !$selectedMember}
	<!-- Profile selector -->
	<div class="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4 py-12">
		<div class="flex items-center gap-3 mb-10">
			<div
				class="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/25"
			>
				<span class="text-white font-bold text-lg">W</span>
			</div>
			<span class="text-xl font-bold text-white">WealthVault</span>
		</div>

		<h1 class="text-xl font-bold text-white mb-1">Who's viewing?</h1>
		<p class="text-white/40 text-sm mb-8">{$family.name}</p>

		<div class="flex flex-wrap justify-center gap-3 max-w-lg">
			{#each $family.members as member, i}
				<button
					onclick={() => selectMember(member)}
					class="group flex flex-col items-center gap-2.5 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 hover:border-emerald-500/40 transition w-32"
				>
					<div
						class="w-14 h-14 rounded-full {colorFor(
							i
						)} flex items-center justify-center text-lg font-bold text-white group-hover:ring-2 group-hover:ring-emerald-500 transition overflow-hidden"
					>
						{#if member.photoURL}
							<img
								src={member.photoURL}
								alt={member.displayName}
								class="w-full h-full object-cover rounded-full"
							/>
						{:else}
							{initials(member.displayName)}
						{/if}
					</div>
					<span class="text-white/80 font-semibold text-xs">{member.displayName}</span>
					{#if member.role === 'admin'}
						<span
							class="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium"
							>Admin</span
						>
					{/if}
				</button>
			{/each}
		</div>

		{#each $family.members as member}
			{#if member.uid === $user?.uid && member.role === 'admin'}
				<div class="mt-8 bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-center">
					<p class="text-white/30 text-xs mb-1">Invite code</p>
					<p class="text-emerald-400 font-mono font-bold text-xl tracking-widest">
						{$family.inviteCode}
					</p>
				</div>
			{/if}
		{/each}

		<button onclick={logout} class="mt-6 text-xs text-white/30 hover:text-white/60 transition"
			>Sign Out</button
		>
	</div>
{:else if $user && $family && $selectedMember}
	<div class="min-h-screen bg-[#0a0a0a]">
		<!-- Desktop top nav -->
		<nav class="hidden md:flex bg-[#111111] border-b border-white/8 px-6 py-2.5 sticky top-0 z-30">
			<div class="max-w-7xl mx-auto w-full flex items-center justify-between">
				<div class="flex items-center gap-5">
					<div class="flex items-center gap-2">
						<div
							class="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center shadow-sm shadow-emerald-500/30"
						>
							<span class="text-white font-bold text-xs">W</span>
						</div>
						<span class="text-white font-bold text-sm">WealthVault</span>
					</div>
					<div class="flex gap-0.5 text-sm">
						{#each navLinks as link}
							<a
								href={link.href}
								class="px-3 py-1.5 rounded-xl font-medium transition text-xs
                  {currentPath === link.href
									? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
									: 'text-white/40 hover:text-white hover:bg-white/5'}">{link.label}</a
							>
						{/each}
					</div>
				</div>
				<div class="flex items-center gap-2">
					<button
						onclick={clearMember}
						class="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl transition border border-white/8"
					>
						<div
							class="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white"
						>
							{initials($selectedMember.displayName)}
						</div>
						<span class="text-xs text-white/70 font-medium">{$selectedMember.displayName}</span>
						<svg
							class="w-3 h-3 text-white/30"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 9l-7 7-7-7"
							/>
						</svg>
					</button>
					<button
						onclick={logout}
						aria-label="Sign out"
						class="flex items-center gap-1.5 text-xs bg-white/5 hover:bg-red-500/10 hover:text-red-400 text-white/40 px-3 py-1.5 rounded-xl transition border border-white/8 font-medium"
					>
						<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
							/>
						</svg>
						Sign Out
					</button>
				</div>
			</div>
		</nav>

		<!-- Mobile top header — compact -->
		<header
			class="md:hidden bg-[#111111] px-4 pt-2 pb-2 sticky top-0 z-30 border-b border-white/8"
		>
			<div class="flex items-center justify-between">
				<div>
					<p class="text-white/30 text-[10px] leading-none mb-0.5">Welcome back 👋</p>
					<p class="text-white font-bold text-base leading-tight">{$selectedMember.displayName}</p>
				</div>
				<div class="flex items-center gap-1.5">
					<button
						onclick={clearMember}
						class="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white shadow-sm shadow-emerald-500/30"
					>
						{initials($selectedMember.displayName)}
					</button>
					<button
						onclick={logout}
						aria-label="Sign out"
						class="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"
					>
						<svg
							class="w-3.5 h-3.5 text-white/40"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
							/>
						</svg>
					</button>
				</div>
			</div>
		</header>

		<!-- Page content -->
		<main class="max-w-full mx-auto px-2 md:px-4 py-3 md:py-4 pb-24">
			{@render children()}
		</main>

		<!-- Mobile bottom nav — compact -->
		<nav class="md:hidden fixed bottom-0 left-0 right-0 bg-[#111111] border-t border-white/8 z-30">
			<div class="flex items-center justify-around px-4 pt-1 pb-2">
				{#each navLinks as link}
					{@const active = currentPath === link.href}
					<a
						href={link.href}
						class="flex flex-col items-center gap-1 px-5 py-1 rounded-xl transition {active
							? 'text-emerald-400'
							: 'text-white/30'}"
					>
						<div class="relative">
							{#if active}
								<div class="absolute inset-0 bg-emerald-500/20 rounded-lg blur-sm"></div>
							{/if}
							<svg
								class="w-4 h-4 relative"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="1.8"
							>
								<path stroke-linecap="round" stroke-linejoin="round" d={link.icon} />
							</svg>
						</div>
						<span class="text-[10px] font-medium">{link.label}</span>
					</a>
				{/each}
			</div>
		</nav>
	</div>
{:else}
	<div class="min-h-screen bg-[#0a0a0a]">
		{@render children()}
	</div>
{/if}


