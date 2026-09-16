export const createElement = (...a) => ({ __el: true, a })
export const useState = () => [null, () => {}]
export const useEffect = () => {}
export const useCallback = (f) => f
export const useMemo = (f) => f()
export const useRef = () => ({ current: null })
export const Fragment = 'Fragment'
// Les ecrans sont charges paresseusement depuis App.jsx : sans ces deux-la,
// tout module important un ecran leve « does not provide an export named
// lazy » — une erreur de harnais qui ressemble a une erreur d application.
export const lazy = (f) => { const L = () => null; L.__factory = f; return L }
export const Suspense = (props) => (props && props.children) || null
export default { createElement, useState, useEffect, useCallback, useMemo, useRef, Fragment, lazy, Suspense }
