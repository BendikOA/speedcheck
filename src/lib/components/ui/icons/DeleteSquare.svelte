<script lang="ts">
  export let size: number = 24;
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  aria-hidden="true"
>
  <rect x="0.75" y="0.75" width="22.5" height="22.5" rx="5" fill="var(--del-sq-bg, var(--color-bg))" stroke="currentColor" stroke-width="1.5" />
  <path
    d="M9 9L15 15M15 9L9 15"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
  />
</svg>
