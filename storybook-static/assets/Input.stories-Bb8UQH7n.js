import{l as h,p as l,a as j,f as B}from"./props-DNs54TwV.js";import{a as C}from"./attributes-wbRXJvFx.js";import{v as F,w as o,x as G,b as H,y as J}from"./runtime-D12LwHDN.js";import"./utils-5-vVqxrL.js";import"./class-DvJjGPJo.js";import"./style-BJCPYodM.js";function K(e,a,d=a){var i=new WeakSet;F(e,"input",async r=>{var t=r?e.defaultValue:e.value;if(t=k(e)?g(t):t,d(t),o!==null&&i.add(o),await G(),t!==(t=a())){var c=e.selectionStart,n=e.selectionEnd,u=e.value.length;if(e.value=t??"",n!==null){var s=e.value.length;c===n&&n===u&&s>u?(e.selectionStart=s,e.selectionEnd=s):(e.selectionStart=c,e.selectionEnd=Math.min(n,s))}}}),H(a)==null&&e.value&&(d(k(e)?g(e.value):e.value),o!==null&&i.add(o)),J(()=>{var r=a();if(e===document.activeElement){var t=o;if(i.has(t))return}k(e)&&r===g(e.value)||e.type==="date"&&!r&&!e.value||r!==e.value&&(e.value=r??"")})}function k(e){var a=e.type;return a==="number"||a==="range"}function g(e){return e===""?null:+e}var L=B("<input/>");function M(e,a){const d=h(a,["children","$$slots","$$events","$$legacy"]),i=h(d,["type","placeholder","value","disabled","required","variant","id","name"]);let r=l(a,"type",8,"text"),t=l(a,"placeholder",8,""),c=l(a,"value",12,""),n=l(a,"disabled",8,!1),u=l(a,"required",8,!1),s=l(a,"variant",8,"default"),O=l(a,"id",8,void 0),U=l(a,"name",8,void 0);var b=L();C(b,()=>({type:r(),placeholder:t(),disabled:n(),required:u(),id:O(),name:U(),class:`input ${s()??""}`,...i}),void 0,void 0,void 0,void 0,!0),K(b,c),j(e,b)}M.__docgen={version:3,name:"index.svelte",data:[{name:"type",visibility:"public",keywords:[],kind:"let",type:{kind:"type",type:"string",text:"string"},static:!1,readonly:!1,defaultValue:'"text"'},{name:"placeholder",visibility:"public",keywords:[],kind:"let",type:{kind:"type",type:"string",text:"string"},static:!1,readonly:!1,defaultValue:'""'},{name:"value",visibility:"public",keywords:[],kind:"let",type:{kind:"type",type:"string",text:"string"},static:!1,readonly:!1,defaultValue:'""'},{name:"disabled",visibility:"public",keywords:[],kind:"let",type:{kind:"type",type:"boolean",text:"boolean"},static:!1,readonly:!1,defaultValue:"false"},{name:"required",visibility:"public",keywords:[],kind:"let",type:{kind:"type",type:"boolean",text:"boolean"},static:!1,readonly:!1,defaultValue:"false"},{name:"variant",visibility:"public",keywords:[],kind:"let",type:{kind:"union",type:[{kind:"const",type:"string",value:"default",text:'"default"'},{kind:"const",type:"string",value:"accent",text:'"accent"'}],text:'"default" | "accent"'},static:!1,readonly:!1,defaultValue:'"default"'},{name:"id",visibility:"public",keywords:[],kind:"let",type:{kind:"type",type:"string",text:"string"},static:!1,readonly:!1},{name:"name",visibility:"public",keywords:[],kind:"let",type:{kind:"type",type:"string",text:"string"},static:!1,readonly:!1}],computed:[],methods:[],components:[],description:null,keywords:[],events:[],slots:[],refs:[]};const ee={title:"UI/Input",component:M,argTypes:{type:{control:"select",options:["text","number","password","email"]},variant:{control:"select",options:["default","accent"]},placeholder:{control:"text"},value:{control:"text"},disabled:{control:"boolean"},required:{control:"boolean"}}},p={args:{placeholder:"Enter text…"}},m={args:{variant:"accent",placeholder:"Accent variant"}},y={args:{value:"Pikachu",placeholder:"Pokémon name"},name:"With value"},v={args:{value:"Disabled input",disabled:!0}},f={args:{type:"number",placeholder:"0–252",value:"252"},name:"Number type"};var x,_,w;p.parameters={...p.parameters,docs:{...(x=p.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    placeholder: 'Enter text…'
  }
}`,...(w=(_=p.parameters)==null?void 0:_.docs)==null?void 0:w.source}}};var S,V,E;m.parameters={...m.parameters,docs:{...(S=m.parameters)==null?void 0:S.docs,source:{originalSource:`{
  args: {
    variant: 'accent',
    placeholder: 'Accent variant'
  }
}`,...(E=(V=m.parameters)==null?void 0:V.docs)==null?void 0:E.source}}};var q,D,P;y.parameters={...y.parameters,docs:{...(q=y.parameters)==null?void 0:q.docs,source:{originalSource:`{
  args: {
    value: 'Pikachu',
    placeholder: 'Pokémon name'
  },
  name: 'With value'
}`,...(P=(D=y.parameters)==null?void 0:D.docs)==null?void 0:P.source}}};var W,A,N;v.parameters={...v.parameters,docs:{...(W=v.parameters)==null?void 0:W.docs,source:{originalSource:`{
  args: {
    value: 'Disabled input',
    disabled: true
  }
}`,...(N=(A=v.parameters)==null?void 0:A.docs)==null?void 0:N.source}}};var I,T,z;f.parameters={...f.parameters,docs:{...(I=f.parameters)==null?void 0:I.docs,source:{originalSource:`{
  args: {
    type: 'number',
    placeholder: '0–252',
    value: '252'
  },
  name: 'Number type'
}`,...(z=(T=f.parameters)==null?void 0:T.docs)==null?void 0:z.source}}};const ae=["Default","Accent","WithValue","Disabled","NumberType"];export{m as Accent,p as Default,v as Disabled,f as NumberType,y as WithValue,ae as __namedExportsOrder,ee as default};
