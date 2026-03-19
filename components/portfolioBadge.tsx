"use client";

export default function PortfolioBadge() {
	return (
		<div className=" bg-transparent p-0 m-0">
			<iframe
				src={`https://portfolio-badge.ardianhoti.com?app=json-explorer-badge`}
				style={{
					position: "fixed",
					bottom: 15,
					right: 15,
					width: 150,
					height: 35,
					border: 0,
					zIndex: 9999,
					borderRadius: 100,
					pointerEvents: "auto",
					background: "transparent",
				}}
				scrolling="no"
				title="Portfolio Badge"
			/>
		</div>
	);
}
