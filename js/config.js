// config.js: part of Load Watch's browser code (native ES module, no build step). See CLAUDE.md for the module map.

export const GRID = {AK:[0,0],ME:[10,0],WI:[5,1],VT:[9,1],NH:[10,1],
WA:[0,2],ID:[1,2],MT:[2,2],ND:[3,2],MN:[4,2],IL:[5,2],MI:[6,2],NY:[8,2],MA:[9,2],
OR:[0,3],NV:[1,3],WY:[2,3],SD:[3,3],IA:[4,3],IN:[5,3],OH:[6,3],PA:[7,3],NJ:[8,3],CT:[9,3],RI:[10,3],
CA:[0,4],UT:[1,4],CO:[2,4],NE:[3,4],MO:[4,4],KY:[5,4],WV:[6,4],VA:[7,4],MD:[8,4],DE:[9,4],
AZ:[1,5],NM:[2,5],KS:[3,5],AR:[4,5],TN:[5,5],NC:[6,5],SC:[7,5],DC:[8,5],
OK:[3,6],LA:[4,6],MS:[5,6],AL:[6,6],GA:[7,6],HI:[0,7],TX:[3,7],FL:[8,7]};
export const NAMES={AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",DC:"District of Columbia",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming"};
export const SLABEL={pause:"Statewide pause in force",rules:"Binding new rules, 2025–26",proposed:"Statewide pause proposed or failed",local:"Local and ballot fights",none:"Not tracked yet"};
export const STLBL={"pause":"Pause in force","in-force":"In force","pending":"Pending","ballot":"On the ballot","failed":"Failed or vetoed","denied":"Project denied","campaign":"Campaign","poll":"Poll","statement":"Statement","protest":"Protest"};
export const LVL={federal:"Federal",state:"State",local:"Local",tribal:"Tribal"};
export const IML={"-2":"Strong headwind","-1":"Headwind","0":"Mixed or neutral","1":"Tailwind","2":"Strong tailwind"};
export const TYL={moratorium:"Moratorium or pause",cost:"Who pays for power",tax:"Tax incentives",water:"Water",siting:"Siting and local control",permitting:"Permitting",disclosure:"Disclosure"};
export const PTL={county:"County",city:"City or town",township:"Township",tribal:"Tribal nation"};
export const OK_LV=new Set(Object.keys(LVL)), OK_TY=new Set(Object.keys(TYL));
export const ACT_ST=new Set(["pause","in-force","pending","ballot","failed","denied"]), POL_ST=new Set(["campaign","poll","statement","protest"]);
export const STANCE={anti:"Against",pro:"Supportive",mixed:"Mixed",neutral:"Neutral"};
export const TOPL={water:"Water",power:"Power and grid",rates:"Utility rates",tax:"Taxes and incentives",jobs:"Jobs and economy",land:"Land and farms",noise:"Noise and pollution",fire:"Wildfire",open:"Transparency",tribe:"Tribal land",tech:"Big Tech and AI",pause:"Moratorium"};
export const TRL=["No engagement yet","Some traction","Notable traction","High traction"];
export const WHOL={person:"Individual account",group:"Organized group"};
