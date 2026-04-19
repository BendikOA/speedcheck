import{p as t,a as g,t as Z,f as $,e as ee}from"./props-DNs54TwV.js";import{e as te,t as ae,d as se}from"./runtime-D12LwHDN.js";import{s as re,a as ie,t as ne}from"./tooltip-DZdYMZTo.js";import{s as oe}from"./attributes-wbRXJvFx.js";import{s as le}from"./class-DvJjGPJo.js";import"./utils-5-vVqxrL.js";import"./style-BJCPYodM.js";var de=$("<button><!></button>");function q(F,e){let G=t(e,"variant",8,"primary"),H=t(e,"size",8,"md"),J=t(e,"disabled",8,!1),K=t(e,"fullWidth",8,!1),M=t(e,"type",8,"button"),N=t(e,"onClick",8,()=>{}),Q=t(e,"active",8,!1),R=t(e,"tooltip",8,""),X=t(e,"class",8,"");var a=de();let u;var Y=se(a);re(Y,e,"default",{},r=>{var s=Z("Button");g(r,s)}),te(()=>ee("click",a,function(...r){var s;(s=N())==null||s.apply(this,r)})),ie(a,(r,s)=>{var y;return(y=ne)==null?void 0:y(r,s)},R),ae(()=>{u=le(a,1,`btn ${G()??""} ${H()??""} ${X()??""}`,null,u,{"full-width":K(),active:Q()}),a.disabled=J(),oe(a,"type",M())}),g(F,a)}q.__docgen={version:3,name:"index.svelte",data:[{name:"variant",visibility:"public",keywords:[],kind:"let",type:{kind:"union",type:[{kind:"const",type:"string",value:"primary",text:'"primary"'},{kind:"const",type:"string",value:"secondary",text:'"secondary"'},{kind:"const",type:"string",value:"danger",text:'"danger"'},{kind:"const",type:"string",value:"toggle",text:'"toggle"'}],text:'"primary" | "secondary" | "danger" | "toggle"'},static:!1,readonly:!1,defaultValue:'"primary"'},{name:"size",visibility:"public",keywords:[],kind:"let",type:{kind:"union",type:[{kind:"const",type:"string",value:"sm",text:'"sm"'},{kind:"const",type:"string",value:"md",text:'"md"'},{kind:"const",type:"string",value:"lg",text:'"lg"'}],text:'"sm" | "md" | "lg"'},static:!1,readonly:!1,defaultValue:'"md"'},{name:"disabled",visibility:"public",keywords:[],kind:"let",type:{kind:"type",type:"boolean",text:"boolean"},static:!1,readonly:!1,defaultValue:"false"},{name:"fullWidth",visibility:"public",keywords:[],kind:"let",type:{kind:"type",type:"boolean",text:"boolean"},static:!1,readonly:!1,defaultValue:"false"},{name:"type",visibility:"public",keywords:[],kind:"let",type:{kind:"union",type:[{kind:"const",type:"string",value:"button",text:'"button"'},{kind:"const",type:"string",value:"submit",text:'"submit"'},{kind:"const",type:"string",value:"reset",text:'"reset"'}],text:'"button" | "submit" | "reset"'},static:!1,readonly:!1,defaultValue:'"button"'},{name:"onClick",visibility:"public",keywords:[],kind:"let",type:{kind:"function",text:"() => void"},static:!1,readonly:!1,defaultValue:"function"},{name:"active",visibility:"public",keywords:[],kind:"let",type:{kind:"type",type:"boolean",text:"boolean"},static:!1,readonly:!1,defaultValue:"false"},{name:"tooltip",visibility:"public",keywords:[],kind:"let",type:{kind:"type",type:"string",text:"string"},static:!1,readonly:!1,defaultValue:'""'},{name:"class",visibility:"public",keywords:[],kind:"let",type:{kind:"type",type:"string",text:"string"},static:!1,readonly:!1}],computed:[],methods:[],components:[],description:null,keywords:[],events:[],slots:[{keywords:[],visibility:"public",description:"",name:"default"}],refs:[]};const fe={title:"UI/Button",component:q,argTypes:{variant:{control:"select",options:["primary","secondary","danger","toggle"]},size:{control:"select",options:["sm","md","lg"]},disabled:{control:"boolean"},active:{control:"boolean"},fullWidth:{control:"boolean"},tooltip:{control:"text"}}},i={args:{variant:"primary",size:"md",disabled:!1}},n={args:{variant:"secondary",size:"md"}},o={args:{variant:"danger",size:"md"}},l={args:{variant:"toggle",size:"md",active:!1}},d={args:{variant:"toggle",size:"md",active:!0},name:"Toggle (active)"},c={args:{variant:"primary",disabled:!0}},m={args:{variant:"primary",size:"sm"}},p={args:{variant:"primary",size:"lg"}};var v,f,b;i.parameters={...i.parameters,docs:{...(v=i.parameters)==null?void 0:v.docs,source:{originalSource:`{
  args: {
    variant: 'primary',
    size: 'md',
    disabled: false
  }
}`,...(b=(f=i.parameters)==null?void 0:f.docs)==null?void 0:b.source}}};var k,x,z;n.parameters={...n.parameters,docs:{...(k=n.parameters)==null?void 0:k.docs,source:{originalSource:`{
  args: {
    variant: 'secondary',
    size: 'md'
  }
}`,...(z=(x=n.parameters)==null?void 0:x.docs)==null?void 0:z.source}}};var w,S,h;o.parameters={...o.parameters,docs:{...(w=o.parameters)==null?void 0:w.docs,source:{originalSource:`{
  args: {
    variant: 'danger',
    size: 'md'
  }
}`,...(h=(S=o.parameters)==null?void 0:S.docs)==null?void 0:h.source}}};var V,_,T;l.parameters={...l.parameters,docs:{...(V=l.parameters)==null?void 0:V.docs,source:{originalSource:`{
  args: {
    variant: 'toggle',
    size: 'md',
    active: false
  }
}`,...(T=(_=l.parameters)==null?void 0:_.docs)==null?void 0:T.source}}};var D,W,B;d.parameters={...d.parameters,docs:{...(D=d.parameters)==null?void 0:D.docs,source:{originalSource:`{
  args: {
    variant: 'toggle',
    size: 'md',
    active: true
  },
  name: 'Toggle (active)'
}`,...(B=(W=d.parameters)==null?void 0:W.docs)==null?void 0:B.source}}};var C,A,L;c.parameters={...c.parameters,docs:{...(C=c.parameters)==null?void 0:C.docs,source:{originalSource:`{
  args: {
    variant: 'primary',
    disabled: true
  }
}`,...(L=(A=c.parameters)==null?void 0:A.docs)==null?void 0:L.source}}};var P,E,I;m.parameters={...m.parameters,docs:{...(P=m.parameters)==null?void 0:P.docs,source:{originalSource:`{
  args: {
    variant: 'primary',
    size: 'sm'
  }
}`,...(I=(E=m.parameters)==null?void 0:E.docs)==null?void 0:I.source}}};var O,U,j;p.parameters={...p.parameters,docs:{...(O=p.parameters)==null?void 0:O.docs,source:{originalSource:`{
  args: {
    variant: 'primary',
    size: 'lg'
  }
}`,...(j=(U=p.parameters)==null?void 0:U.docs)==null?void 0:j.source}}};const be=["Primary","Secondary","Danger","Toggle","ToggleActive","Disabled","Small","Large"];export{o as Danger,c as Disabled,p as Large,i as Primary,n as Secondary,m as Small,l as Toggle,d as ToggleActive,be as __namedExportsOrder,fe as default};
