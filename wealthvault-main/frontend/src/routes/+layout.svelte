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

	function colorFor(index: number) {
		return avatarColors[index % avatarColors.length];
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

	// Redirect to login if not authenticated
	$effect(() => {
		if (browser && !$loading && !$user && $page.url.pathname !== '/login') {
			goto('/login');
		}
	});

	// Once logged in, load family data and redirect if not set up
	$effect(() => {
		if (browser && $user && !$loading) {
			loadFamily().then((f) => {
				if (!f && $page.url.pathname !== '/family' && $page.url.pathname !== '/login') {
					goto('/family');
				}
			});
		}
	});
</script>

{#if $loading}
	<div class="min-h-screen bg-gray-950 flex items-center justify-center">
		<div class="text-center">
			<div
				class="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"
			></div>
			<p class="text-gray-400">Loading WealthVault...</p>
		</div>
	</div>
{:else if !$user && $page.url.pathname !== '/login'}
	<div class="min-h-screen bg-gray-950 flex items-center justify-center">
		<p class="text-gray-400">Redirecting...</p>
	</div>
{:else if $page.url.pathname === '/login' || $page.url.pathname === '/family'}
	{@render children()}
{:else if $user && $family && !$selectedMember}
	<!-- Netflix-style profile selector -->
	<div class="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
		<h1 class="text-3xl font-bold text-white mb-2">Who's viewing?</h1>
		<p class="text-gray-500 text-sm mb-12">{$family.name}</p>

		<div class="flex flex-wrap justify-center gap-6 max-w-2xl">
			{#each $family.members as member, i}
				<button
					onclick={() => selectMember(member)}
					class="group flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-gray-800 transition w-36"
				>
					<div
						class="w-20 h-20 rounded-full {colorFor(
							i
						)} flex items-center justify-center text-2xl font-bold text-white group-hover:ring-4 group-hover:ring-white transition overflow-hidden"
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
					<span class="text-gray-300 group-hover:text-white text-sm font-medium transition"
						>{member.displayName}</span
					>
					{#if member.role === 'admin'}
						<span class="text-xs text-emerald-400">Admin</span>
					{/if}
				</button>
			{/each}
		</div>

		<!-- Invite code shown to admin -->
		{#each $family.members as member}
			{#if member.uid === $user?.uid && member.role === 'admin'}
				<div class="mt-12 bg-gray-900 border border-gray-800 rounded-xl px-6 py-4 text-center">
					<p class="text-gray-500 text-xs mb-1">Share this code to invite family members</p>
					<p class="text-emerald-400 font-mono font-bold text-lg tracking-widest">
						{$family.inviteCode}
					</p>
				</div>
			{/if}
		{/each}

		<button onclick={logout} class="mt-8 text-sm text-gray-600 hover:text-gray-400 transition"
			>Sign Out</button
		>
	</div>
{:else if $user && $family && $selectedMember}
	<!-- Main app -->
	<div class="min-h-screen bg-gray-950 text-white">
		<nav class="bg-gray-900 border-b border-gray-800 px-6 py-4">
			<div class="max-w-7xl mx-auto flex items-center justify-between">
				<div class="flex items-center gap-8">
					<span class="text-emerald-400 font-bold text-xl">WealthVault</span>
					<div class="flex gap-6 text-sm">
						<a href="/dashboard" class="text-gray-300 hover:text-white transition">Dashboard</a>
						<a href="/stocks" class="text-gray-300 hover:text-white transition">Stocks</a>
						<a href="/mutualfunds" class="text-gray-300 hover:text-white transition">Mutual Funds</a
						>
						<a href="/gold" class="text-gray-300 hover:text-white transition">Gold</a>
						<a href="/property" class="text-gray-300 hover:text-white transition">Property</a>
					</div>
				</div>
				<div class="flex items-center gap-4">
					<button
						onclick={clearMember}
						class="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg transition"
						title="Switch profile"
					>
						<div
							class="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-black"
						>
							{initials($selectedMember.displayName)}
						</div>
						<span class="text-sm text-gray-200">{$selectedMember.displayName}</span>
						<span class="text-xs text-gray-500">▾</span>
					</button>
					<button
						onclick={logout}
						class="text-sm bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition"
					>
						Sign Out
					</button>
				</div>
			</div>
		</nav>
		<main class="max-w-7xl mx-auto px-6 py-8">
			{@render children()}
		</main>
	</div>
{:else}
	<div class="min-h-screen bg-gray-950 text-white">
		{@render children()}
	</div>
{/if}
