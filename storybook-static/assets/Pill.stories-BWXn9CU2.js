import{p as r,a as Y,f as Z,e as $}from"./props-DNs54TwV.js";import{i as ee,z as te,B as ae,e as re,t as oe,C as se,D as ie,E as h,n as k,d as le,F as ne,G as ce}from"./runtime-D12LwHDN.js";import{s as de,a as pe,t as ue}from"./tooltip-DZdYMZTo.js";import{s as me}from"./class-DvJjGPJo.js";import{s as fe}from"./style-BJCPYodM.js";function ve(f,e){var s;var t=(s=f.$$events)==null?void 0:s[e.type],o=ee(t)?t.slice():t==null?[]:[t];for(var v of o)v.call(this,e)}var ye=Z("<span><!></span>");function J(f,e){ie(e,!1);const t=ne();let o=r(e,"color",8,null),v=r(e,"variant",8,"primary"),s=r(e,"active",8,!0),K=r(e,"interactive",8,!1),L=r(e,"tooltip",8,""),N=r(e,"strikethrough",8,!1);te(()=>(h(o()),h(s())),()=>{ce(t,!!o()&&s())}),ae();var a=ye();let g;var Q=le(a);de(Q,e,"default",{},null),pe(a,(y,X)=>{var b;return(b=ue)==null?void 0:b(y,X)},L),re(()=>$("click",a,function(y){ve.call(this,e,y)})),oe(()=>{g=me(a,1,`pill ${v()??""}`,null,g,{colored:k(t),interactive:K(),strikethrough:N()}),fe(a,k(t)?`--pill-color: ${o()}`:"")}),Y(f,a),se()}J.__docgen={version:3,name:"index.svelte",data:[{name:"color",visibility:"public",description:`Accent color — any valid CSS color string, e.g. "#f5c96c" or "var(--gb-1)".\r
  When omitted the pill renders in muted/neutral style.`,keywords:[],kind:"let",type:{kind:"type",type:"string",text:"string"},static:!1,readonly:!1,defaultValue:"null"},{name:"variant",visibility:"public",description:"'primary' = dark fill + light text (default). 'alt' = light background + colored text/border.",keywords:[],kind:"let",type:{kind:"union",type:[{kind:"const",type:"string",value:"primary",text:'"primary"'},{kind:"const",type:"string",value:"alt",text:'"alt"'}],text:'"primary" | "alt"'},static:!1,readonly:!1,defaultValue:'"primary"'},{name:"active",visibility:"public",description:"Set to false to render muted even when a color is supplied (e.g. inactive toggle).",keywords:[],kind:"let",type:{kind:"type",type:"boolean",text:"boolean"},static:!1,readonly:!1,defaultValue:"true"},{name:"interactive",visibility:"public",description:"Adds cursor:pointer and hover styles. Forward on:click from the parent.",keywords:[],kind:"let",type:{kind:"type",type:"boolean",text:"boolean"},static:!1,readonly:!1,defaultValue:"false"},{name:"tooltip",visibility:"public",description:"Tooltip text — shown on hover/tap via the global tooltip system.",keywords:[],kind:"let",type:{kind:"type",type:"string",text:"string"},static:!1,readonly:!1,defaultValue:'""'},{name:"strikethrough",visibility:"public",description:"Renders text with a strikethrough — used for suppressed/blocked states.",keywords:[],kind:"let",type:{kind:"type",type:"boolean",text:"boolean"},static:!1,readonly:!1,defaultValue:"false"}],computed:[],methods:[],components:[],description:null,keywords:[],events:[{keywords:[],visibility:"public",description:"svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions",name:"click",parent:"span",modificators:[],locations:null}],slots:[{keywords:[],visibility:"public",description:"",name:"default"}],refs:[]};const we={title:"UI/Pill",component:J,argTypes:{variant:{control:"select",options:["primary","alt"]},color:{control:"color"},active:{control:"boolean"},interactive:{control:"boolean"},strikethrough:{control:"boolean"},tooltip:{control:"text"}}},i={args:{active:!0}},l={args:{color:"#f5c96c",active:!0},name:"Colored (Scarf yellow)"},n={args:{color:"#a8c8ff",variant:"alt",active:!0},name:"Alt variant (item)"},c={args:{color:"#f56cc8",active:!1}},d={args:{color:"#f56cc8",active:!1,strikethrough:!0}},p={args:{color:"#6cf5b8",active:!0,interactive:!0}},u={args:{color:"#f56cc8",active:!0},name:"Priority move"},m={args:{color:"#6cf5b8",active:!0},name:"Weather ability"};var _,w,x;i.parameters={...i.parameters,docs:{...(_=i.parameters)==null?void 0:_.docs,source:{originalSource:`{
  args: {
    active: true
  }
}`,...(x=(w=i.parameters)==null?void 0:w.docs)==null?void 0:x.source}}};var S,A,V;l.parameters={...l.parameters,docs:{...(S=l.parameters)==null?void 0:S.docs,source:{originalSource:`{
  args: {
    color: '#f5c96c',
    active: true
  },
  name: 'Colored (Scarf yellow)'
}`,...(V=(A=l.parameters)==null?void 0:A.docs)==null?void 0:V.source}}};var C,P,I;n.parameters={...n.parameters,docs:{...(C=n.parameters)==null?void 0:C.docs,source:{originalSource:`{
  args: {
    color: '#a8c8ff',
    variant: 'alt',
    active: true
  },
  name: 'Alt variant (item)'
}`,...(I=(P=n.parameters)==null?void 0:P.docs)==null?void 0:I.source}}};var W,D,E;c.parameters={...c.parameters,docs:{...(W=c.parameters)==null?void 0:W.docs,source:{originalSource:`{
  args: {
    color: '#f56cc8',
    active: false
  }
}`,...(E=(D=c.parameters)==null?void 0:D.docs)==null?void 0:E.source}}};var F,M,T;d.parameters={...d.parameters,docs:{...(F=d.parameters)==null?void 0:F.docs,source:{originalSource:`{
  args: {
    color: '#f56cc8',
    active: false,
    strikethrough: true
  }
}`,...(T=(M=d.parameters)==null?void 0:M.docs)==null?void 0:T.source}}};var z,B,G;p.parameters={...p.parameters,docs:{...(z=p.parameters)==null?void 0:z.docs,source:{originalSource:`{
  args: {
    color: '#6cf5b8',
    active: true,
    interactive: true
  }
}`,...(G=(B=p.parameters)==null?void 0:B.docs)==null?void 0:G.source}}};var O,R,U;u.parameters={...u.parameters,docs:{...(O=u.parameters)==null?void 0:O.docs,source:{originalSource:`{
  args: {
    color: '#f56cc8',
    active: true
  },
  name: 'Priority move'
}`,...(U=(R=u.parameters)==null?void 0:R.docs)==null?void 0:U.source}}};var j,q,H;m.parameters={...m.parameters,docs:{...(j=m.parameters)==null?void 0:j.docs,source:{originalSource:`{
  args: {
    color: '#6cf5b8',
    active: true
  },
  name: 'Weather ability'
}`,...(H=(q=m.parameters)==null?void 0:q.docs)==null?void 0:H.source}}};const xe=["Default","Colored","AltVariant","Inactive","Strikethrough","Interactive","PriorityMove","WeatherAbility"];export{n as AltVariant,l as Colored,i as Default,c as Inactive,p as Interactive,u as PriorityMove,d as Strikethrough,m as WeatherAbility,xe as __namedExportsOrder,we as default};
