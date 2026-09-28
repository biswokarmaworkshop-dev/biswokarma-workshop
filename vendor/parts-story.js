(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BiswokarmaPartsStory = api;
})(typeof globalThis === "undefined" ? this : globalThis, function () {
  "use strict";

  const chapters = [
    {
      id: "hydraulics",
      number: "01",
      title: "Hydraulics",
      statement: "Power, pressure, precision.",
      detail:
        "Pumps, control valves, hoses, cylinders and service kits. Verify codes, port patterns and cylinder dimensions before ordering.",
      systems: ["Hydraulic Pump", "Control Valve", "Hydraulic Hose", "Hydraulic Cylinder"],
      productIds: ["jcb3dx-003", "jcb3dx-004", "jcb3dx-019", "jcb3dx-020"],
      metric: "PRESSURE · FLOW · FITMENT",
    },
    {
      id: "engine",
      number: "02",
      title: "Engine",
      statement: "Keep the heart of the machine working.",
      detail:
        "JCB 444 engine-service references with fitment notes. Confirm engine variant and serial range with the workshop.",
      systems: ["444 Engine Parts", "Engine Gasket Set", "Piston Ring Set", "Water Pump"],
      productIds: ["jcb3dx-017", "jcb3dx-018", "jcb3dx-016", "jcb3dx-015"],
      metric: "ENGINE FAMILY · SERIAL RANGE",
    },
    {
      id: "filters",
      number: "03",
      title: "Filters",
      statement: "Protect every working circuit.",
      detail:
        "Air, oil, fuel and hydraulic filter references. Match element dimensions, connections and filtration rating to the installed system.",
      systems: ["Air Filter", "Oil Filter", "Fuel Filter", "Hydraulic Filter"],
      productIds: ["jcb3dx-008", "jcb3dx-009", "jcb3dx-010", "jcb3dx-011"],
      metric: "AIR · OIL · FUEL · HYDRAULIC",
    },
    {
      id: "transmission",
      number: "04",
      title: "Transmission",
      statement: "Transfer torque with confidence.",
      detail:
        "Clutch and brake service references. Check transmission configuration, disc dimensions and spline details before selection.",
      systems: ["Clutch Plate", "Brake Disc", "Front Axle Parts"],
      productIds: ["jcb3dx-024", "jcb3dx-025", "jcb3dx-026"],
      metric: "DRIVE · BRAKING · AXLE",
    },
    {
      id: "undercarriage",
      number: "05",
      title: "Undercarriage",
      statement: "Built around the ground beneath you.",
      detail:
        "Track chain, roller and sprocket references. Confirm pitch, link count and machine configuration for the correct match.",
      systems: ["Track Roller", "Track Chain", "Sprocket"],
      productIds: ["jcb3dx-021", "jcb3dx-022", "jcb3dx-023"],
      metric: "PITCH · LINKS · PROFILE",
    },
    {
      id: "attachments",
      number: "06",
      title: "Bucket & attachments",
      statement: "Match the work at the business end.",
      detail:
        "Bucket teeth, adapters, pins and bushes. Verify tooth series, bucket lip and pivot dimensions against your attachment.",
      systems: ["Bucket Teeth", "Tooth Adapter", "Bush", "Pin"],
      productIds: ["jcb3dx-001", "jcb3dx-002", "jcb3dx-028", "jcb3dx-029"],
      metric: "TOOTH SERIES · PIVOT · DIMENSIONS",
    },
    {
      id: "electrical",
      number: "07",
      title: "Electrical",
      statement: "Reliable starts. Stable charge.",
      detail:
        "Alternator and starter-motor references. Confirm voltage, output, pulley, pinion and mounting arrangement before ordering.",
      systems: ["Alternator", "Starter Motor", "Radiator"],
      productIds: ["jcb3dx-012", "jcb3dx-013", "jcb3dx-014"],
      metric: "VOLTAGE · OUTPUT · CONNECTION",
    },
    {
      id: "seals",
      number: "08",
      title: "Seals & repair kits",
      statement: "Service the fit. Restore the seal.",
      detail:
        "Cylinder and general seal-kit references for workshop confirmation. Measure bore, rod and gland dimensions before ordering.",
      systems: ["Boom Cylinder Kit", "Arm Cylinder Kit", "Bucket Cylinder Kit", "General Seal Kit"],
      productIds: ["jcb3dx-005", "jcb3dx-006", "jcb3dx-007", "jcb3dx-030"],
      metric: "BORE · ROD · SEAL PROFILE",
    },
  ];

  function nearestChapterIndex(chapterRects, viewportCenter) {
    if (!chapterRects.length) return 0;
    let nearest = 0;
    let distance = Number.POSITIVE_INFINITY;
    chapterRects.forEach((rect, index) => {
      const nextDistance = Math.abs(rect.top + rect.height * 0.5 - viewportCenter);
      if (nextDistance < distance) {
        nearest = index;
        distance = nextDistance;
      }
    });
    return nearest;
  }

  return { chapters, nearestChapterIndex };
});
