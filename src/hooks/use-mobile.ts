import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
	const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
		undefined,
	);

	const update = React.useCallback(() => {
		setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
	}, []);

	React.useLayoutEffect(() => {
		const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
		mql.addEventListener("change", update);
		update();
		return () => mql.removeEventListener("change", update);
	}, [update]);

	return !!isMobile;
}
