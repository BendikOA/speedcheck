<script lang="ts">
  import { cn } from "$lib/utils";
  import { onMount, onDestroy } from "svelte";

  interface Sparkle {
    id: string;
    x: number;
    y: number;
    color: string;
    size: number;
    delay: number;
    duration: number;
    rotation: number;
  }

  export let text: string = "Hello World";
  export let colors = {
    first: "#c084e8",
    second: "#6abf5e",
  };
  export let sparklesCount = 10;

  let className = "";
  export { className as class };

  let sparkles: Sparkle[] = [];

  function generateSparkle(): Sparkle {
    return {
      id: Math.random().toString(36).slice(2),
      x: Math.random() * 100,
      y: Math.random() * 100,
      color: Math.random() > 0.5 ? colors.first : colors.second,
      size: Math.random() * 6 + 5,
      delay: Math.random() * 3,
      duration: Math.random() * 1.2 + 0.8,
      rotation: Math.random() * 90,
    };
  }

  let interval: ReturnType<typeof setInterval>;

  onMount(() => {
    sparkles = Array.from({ length: sparklesCount }, generateSparkle);
    // Occasionally swap a random sparkle to keep them feeling alive
    interval = setInterval(() => {
      const idx = Math.floor(Math.random() * sparkles.length);
      sparkles[idx] = generateSparkle();
      sparkles = [...sparkles];
    }, 800);
  });

  onDestroy(() => clearInterval(interval));
</script>

<span class={cn("sparkles-root", className)} {...$$restProps}>
  <span class="sparkles-inner">
    {#each sparkles as sp (sp.id)}
      <svg
        class="sparkle-svg"
        width={sp.size}
        height={sp.size}
        viewBox="0 0 21 21"
        aria-hidden="true"
        style="left:{sp.x}%;top:{sp.y}%;animation-delay:{sp.delay}s;animation-duration:{sp.duration}s;--rot:{sp.rotation}deg"
      >
        <path
          d="M9.82531 0.843845C10.0553 0.215178 10.9446 0.215178 11.1746 0.843845L11.8618 2.72026C12.4006 4.19229 12.3916 6.39157 13.5 7.5C14.6084 8.60843 16.8077 8.59935 18.2797 9.13822L20.1561 9.82534C20.7858 10.0553 20.7858 10.9447 20.1561 11.1747L18.2797 11.8618C16.8077 12.4007 14.6084 12.3916 13.5 13.5C12.3916 14.6084 12.4006 16.8077 11.8618 18.2798L11.1746 20.1562C10.9446 20.7858 10.0553 20.7858 9.82531 20.1562L9.13819 18.2798C8.59932 16.8077 8.60843 14.6084 7.5 13.5C6.39157 12.3916 4.19225 12.4007 2.72023 11.8618L0.843814 11.1747C0.215148 10.9447 0.215148 10.0553 0.843814 9.82534L2.72023 9.13822C4.19225 8.59935 6.39157 8.60843 7.5 7.5C8.60843 6.39157 8.59932 4.19229 9.13819 2.72026L9.82531 0.843845Z"
          fill={sp.color}
        />
      </svg>
    {/each}
    <strong class="sparkles-label">{text}</strong>
  </span>
</span>

<style>
  .sparkles-root {
    display: inline-flex;
    align-items: center;
  }

  .sparkles-inner {
    position: relative;
    display: inline-block;
  }

  .sparkle-svg {
    pointer-events: none;
    position: absolute;
    transform-origin: center;
    animation: sparkle-pop var(--dur, 1s) var(--delay, 0s) ease-in-out infinite;
    opacity: 0;
  }

  @keyframes sparkle-pop {
    0%   { opacity: 0; transform: scale(0) rotate(var(--rot, 0deg)); }
    30%  { opacity: 1; transform: scale(1) rotate(calc(var(--rot, 0deg) + 45deg)); }
    70%  { opacity: 1; transform: scale(0.8) rotate(calc(var(--rot, 0deg) + 90deg)); }
    100% { opacity: 0; transform: scale(0) rotate(calc(var(--rot, 0deg) + 135deg)); }
  }

  .sparkles-label {
    position: relative;
    z-index: 1;
    font-family: var(--font-heading);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1;
  }
</style>
