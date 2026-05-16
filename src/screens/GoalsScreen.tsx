import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useApp } from '../context/AppContext';
import { COLORS } from '../utils/constants';
import { formatVND } from '../utils/helpers';
import { Card, Button, Input, SectionHeader, ProgressBar, EmptyState } from '../components/UI';

const EMOJIS = ['🏍','✈️','🏠','💻','📱','🎓','💍','🚗','🏖','🎯'];

export function GoalsScreen() {
  const { state, addGoal, updateGoal, deleteGoal } = useApp();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name:'', target:'', saved:'', emoji:'🎯' });
  const [errors, setErrors] = useState<Record<string,string>>({});

  function setF(k:string,v:string){ setForm(f=>({...f,[k]:v})); }

  function validate(){
    const e: Record<string,string>={};
    if(!form.name.trim()) e.name='Nhập tên mục tiêu';
    if(!form.target||Number(form.target)<=0) e.target='Nhập số tiền mục tiêu';
    setErrors(e); return !Object.keys(e).length;
  }

  async function handleAdd(){
    if(!validate()) return;
    await addGoal(form.name.trim(),Number(form.target),Number(form.saved)||0,form.emoji);
    setForm({name:'',target:'',saved:'',emoji:'🎯'}); setShow(false);
  }

  function handleTopUp(id:string, current:number, target:number){
    Alert.prompt('Nạp thêm tiền',`Hiện có: ${formatVND(current)}`,
      [{text:'Huỷ',style:'cancel'},{text:'Nạp',onPress: async (txt: string | undefined) => {
        const a=Number(txt??0);
        if(a>0) await updateGoal(id,Math.min(current+a,target));
      }}],'plain-text','','numeric');
  }

  function handleDelete(id:string,name:string){
    Alert.alert('Xoá mục tiêu',`Xoá "${name}"?`,[
      {text:'Huỷ',style:'cancel'},
      {text:'Xoá',style:'destructive',onPress:()=>deleteGoal(id)},
    ]);
  }

  return (
    <ScrollView style={s.screen} showsVerticalScrollIndicator={false}>
      <View style={s.hdr}>
        <Text style={s.hdrTtl}>Mục tiêu tiết kiệm</Text>
        <TouchableOpacity style={s.addBtn} onPress={()=>setShow(v=>!v)}>
          <Text style={s.addBtnTxt}>{show?'✕ Đóng':'+ Thêm'}</Text>
        </TouchableOpacity>
      </View>
      <View style={s.body}>
        {show&&(
          <Card>
            <SectionHeader title="Mục tiêu mới"/>
            <Text style={s.emojiLbl}>Chọn biểu tượng</Text>
            <View style={s.emojiRow}>
              {EMOJIS.map(e=>(
                <TouchableOpacity key={e} style={[s.emojiBtn,form.emoji===e&&s.emojiBtnOn]} onPress={()=>setF('emoji',e)}>
                  <Text style={{fontSize:20}}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Input label="Tên mục tiêu" value={form.name} onChangeText={v=>setF('name',v)} placeholder="Ví dụ: Mua xe máy" error={errors.name}/>
            <Input label="Số tiền mục tiêu (đ)" value={form.target} onChangeText={v=>setF('target',v)} placeholder="0" keyboardType="numeric" error={errors.target}/>
            <Input label="Đã tiết kiệm (đ)" value={form.saved} onChangeText={v=>setF('saved',v)} placeholder="0" keyboardType="numeric"/>
            <Button label="Tạo mục tiêu" onPress={handleAdd}/>
          </Card>
        )}
        {state.goals.length===0
          ? <EmptyState icon="🎯" message="Chưa có mục tiêu nào"/>
          : state.goals.map(g=>{
              const pct=Math.min(g.saved/g.target,1); const done=pct>=1;
              return (
                <Card key={g.id}>
                  <View style={s.goalHdr}>
                    <View style={[s.goalIco,done&&{backgroundColor:'#EDFAF3'}]}>
                      <Text style={{fontSize:26}}>{done?'✅':g.emoji}</Text>
                    </View>
                    <View style={{flex:1,marginLeft:12}}>
                      <Text style={s.goalName}>{g.name}</Text>
                      <Text style={s.goalSub}>{formatVND(g.saved)} / {formatVND(g.target)}</Text>
                    </View>
                    <TouchableOpacity onPress={()=>handleDelete(g.id,g.name)}>
                      <Text style={{fontSize:18,color:'#ccc'}}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{marginVertical:12}}>
                    <ProgressBar pct={pct} color={done?COLORS.success:COLORS.primary} height={8}/>
                  </View>
                  <View style={s.goalFtr}>
                    <View>
                      <Text style={s.pct}>{Math.round(pct*100)}% hoàn thành</Text>
                      {done
                        ? <Text style={{fontSize:12,color:COLORS.success,fontWeight:'600'}}>🎉 Đã đạt!</Text>
                        : <Text style={s.remain}>Còn {formatVND(g.target-g.saved)}</Text>}
                    </View>
                    {!done&&(
                      <TouchableOpacity style={s.topupBtn} onPress={()=>handleTopUp(g.id,g.saved,g.target)}>
                        <Text style={s.topupTxt}>+ Nạp thêm</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </Card>
              );
            })
        }
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen:{flex:1,backgroundColor:COLORS.bg},
  hdr:{backgroundColor:COLORS.dark,padding:20,paddingTop:56,paddingBottom:28,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  hdrTtl:{fontSize:22,fontWeight:'700',color:'#fff'},
  addBtn:{backgroundColor:COLORS.primary,borderRadius:20,paddingHorizontal:14,paddingVertical:7},
  addBtnTxt:{fontSize:13,fontWeight:'600',color:'#fff'},
  body:{padding:16},
  emojiLbl:{fontSize:12,color:COLORS.textSecondary,fontWeight:'500',marginBottom:8},
  emojiRow:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:14},
  emojiBtn:{width:44,height:44,borderRadius:12,backgroundColor:COLORS.bg,alignItems:'center',justifyContent:'center',borderWidth:1.5,borderColor:'transparent'},
  emojiBtnOn:{borderColor:COLORS.primary,backgroundColor:COLORS.primaryLight},
  goalHdr:{flexDirection:'row',alignItems:'center'},
  goalIco:{width:52,height:52,borderRadius:16,backgroundColor:COLORS.primaryLight,alignItems:'center',justifyContent:'center'},
  goalName:{fontSize:15,fontWeight:'600',color:COLORS.dark},
  goalSub:{fontSize:12,color:COLORS.textMuted,marginTop:3},
  goalFtr:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  pct:{fontSize:12,fontWeight:'600',color:COLORS.dark},
  remain:{fontSize:11,color:COLORS.textMuted,marginTop:2},
  topupBtn:{backgroundColor:COLORS.primaryLight,borderRadius:20,paddingHorizontal:14,paddingVertical:7},
  topupTxt:{fontSize:12,fontWeight:'600',color:COLORS.primary},
});
