#!/bin/sh
# Stands in for qemu-pebble (PEBBLE_QEMU_PATH) so the emulator records every
# block it translates from boot, without chaining blocks, into
# $QEMU_TRACE_DIR/0000-boot.log. tools/energy/measure.mjs then turns on
# per-block execution logging, through QEMU's monitor, only around each
# measured window.
case "$1" in --version) exec "$QEMU_REAL" "$@";; esac
exec "$QEMU_REAL" -d in_asm,nochain -D "$QEMU_TRACE_DIR/0000-boot.log" "$@"
