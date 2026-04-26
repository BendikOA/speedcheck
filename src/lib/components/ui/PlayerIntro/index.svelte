<script lang="ts">
  import "./styles.scss";

  export let step: string = "";
  export let title: string = "";
</script>

<div class="player-intro">
  {#if step}
    <span class="player-intro-step">{step}</span>
  {/if}
  <span class="player-intro-title">{title}</span>
</div>
