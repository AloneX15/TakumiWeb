<script lang="ts">
  let { size = 36 }: { size?: number } = $props();
</script>

<!-- The fox PNG is a mask so it takes the accent gradient (same as the launcher). -->
<span class="logo" style:--size="{size}px" role="img" aria-label="Takumi"></span>

<style>
  .logo {
    display: block;
    flex-shrink: 0;
    width: var(--size);
    height: var(--size);
    background: linear-gradient(170deg, var(--accent-hover), var(--accent) 55%, var(--accent-deep));
    -webkit-mask: url('/takumi-fox.png') center / contain no-repeat;
    mask: url('/takumi-fox.png') center / contain no-repeat;
  }
</style>
