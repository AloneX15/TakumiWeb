<script lang="ts">
  import type { Snippet } from 'svelte';
  import Logo from './Logo.svelte';

  let { title, subtitle, children }: { title: string; subtitle: string; children: Snippet } = $props();
</script>

<div class="screen">
  <div class="card panel">
    <Logo size={46} />
    <h1>{title}</h1>
    <p class="muted">{subtitle}</p>
    {@render children()}
  </div>
</div>

<style>
  .screen {
    display: flex;
    justify-content: center;
    padding: 56px 20px;
    background: radial-gradient(circle at 50% 0%, var(--accent-soft), transparent 55%);
  }

  .panel {
    width: 100%;
    max-width: 420px;
    padding: 32px;
  }

  h1 {
    font-size: 26px;
    margin-top: 18px;
  }

  .panel > p {
    margin: 4px 0 22px;
  }
</style>
