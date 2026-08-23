export const createElement = (...a) => ({ __el: true, a })
export const useState = () => [null, () => {}]
export const useEffect = () => {}
export const useCallback = (f) => f
export const useMemo = (f) => f()
export const useRef = () => ({ current: null })
export const Fragment = 'Fragment'
export default { createElement, useState, useEffect, useCallback, useMemo, useRef, Fragment }
