// ─── AddScreen ────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useApp } from '../context/AppContext';
import { COLORS, CAT_CONFIG, QUICK_EXPENSES } from '../utils/constants';
import { Button, Card, Input, SectionHeader } from '../components/UI';
import { Category } from '../types';

const CATS: Category[] = ['food','move','shop','health','fun','other'];

export function AddScreen() {
  const { addTransaction } = useApp();
  const [type, setType] = useState<'exp'|'inc'>('exp');
  const [name, setName] = useState('');
  const [amt, setAmt] = useState('');
  const [cat, setCat] = useState<Category>('food');
  const [errors, setErrors] = useState<{name?:string;amt?:string}>({});
  const [done, setDone] = useState(false);

  function validate() {
    const e: typeof errors = {};
    if (!name.trim()) e.name = 'Vui lòng nhập tên';
    if (!amt || Number(amt) <= 0) e.amt = 'Vui lòng nhập số tiền';
    setErrors(e); return !Object.keys(e).length;
  }

  async function handle() {
    if (!validate()) return;
    await addTransaction({ name: name.trim(), amt: Number(amt), cat, type, date: new Date().toLocaleDateString('vi-VN') });
    setName(''); setAmt(''); setErrors({});
    setDone(true); setTimeout(() => setDone(false), 1800);
  }

  async function quickAdd(q: typeof QUICK_EXPENSES[0]) {
    await addTransaction({ name: q.name, amt: q.amt, cat: q.cat, type: 'exp', date: new Date().toLocaleDateString('vi-VN') });
    Alert.alert('✅ Đã thêm', `${q.icon} ${q.name}`);
  }

  return (
    <ScrollView style={st.screen} showsVerticalScrollIndicator={false}>
      <View style={st.hdr}><Text style={st.hdrTtl}>Thêm giao dịch</Text></View>
      <View style={st.body}>
        <View style={st.typeRow}>
          {(['exp','inc'] as const).map(t => (
            <TouchableOpacity key={t} style={[st.typeBtn, type===t && (t==='exp'?st.typeBtnExp:st.typeBtnInc)]} onPress={()=>setType(t)}>
              <Text style={[st.typeTxt, type===t && {color: t==='exp'?COLORS.danger:COLORS.success}]}>{t==='exp'?'💸 Chi tiêu':'💰 Thu nhập'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Card>
          <Input label="Tên khoản" value={name} onChangeText={setName} placeholder="Ví dụ: Cà phê Highlands" error={errors.name} />
          <Input label="Số tiền (đ)" value={amt} onChangeText={setAmt} placeholder="0" keyboardType="numeric" error={errors.amt} />
          {type==='exp' && <>
            <Text style={st.catLbl}>Danh mục</Text>
            <View style={st.catGrid}>
              {CATS.map(c => { const cfg=CAT_CONFIG[c]; return (
                <TouchableOpacity key={c} style={[st.catItem, cat===c&&{backgroundColor:cfg.bg,borderColor:cfg.color}]} onPress={()=>setCat(c)}>
                  <Text style={{fontSize:20}}>{cfg.icon}</Text>
                  <Text style={[st.catTxt, cat===c&&{color:cfg.color}]}>{cfg.label}</Text>
                </TouchableOpacity>
              );})}
            </View>
          </>}
          {done
            ? <View style={st.ok}><Text style={{fontSize:14,fontWeight:'600',color:COLORS.success}}>✅ Đã thêm thành công!</Text></View>
            : <Button label="Thêm vào hũ" onPress={handle} />}
        </Card>
        <SectionHeader title="Chi tiêu định kỳ" />
        <View style={st.quickGrid}>
          {QUICK_EXPENSES.map((q,i) => (
            <TouchableOpacity key={i} style={st.quickItem} onPress={()=>quickAdd(q)}>
              <Text style={{fontSize:22,marginBottom:4}}>{q.icon}</Text>
              <Text style={st.qName}>{q.name}</Text>
              <Text style={st.qAmt}>{Math.round(q.amt/1000)}k</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  screen:{flex:1,backgroundColor:COLORS.bg},
  hdr:{backgroundColor:COLORS.dark,padding:20,paddingTop:56},
  hdrTtl:{fontSize:20,fontWeight:'700',color:'#fff'},
  body:{padding:16},
  typeRow:{flexDirection:'row',gap:10,marginBottom:14},
  typeBtn:{flex:1,paddingVertical:12,borderRadius:14,backgroundColor:'#fff',alignItems:'center',borderWidth:1.5,borderColor:'#eee'},
  typeBtnExp:{backgroundColor:'#FFF0F0',borderColor:COLORS.danger},
  typeBtnInc:{backgroundColor:'#EDFAF3',borderColor:COLORS.success},
  typeTxt:{fontSize:14,fontWeight:'600',color:COLORS.textSecondary},
  catLbl:{fontSize:12,color:COLORS.textSecondary,fontWeight:'500',marginBottom:10},
  catGrid:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:16},
  catItem:{width:'30%',paddingVertical:10,borderRadius:12,alignItems:'center',backgroundColor:COLORS.bg,borderWidth:1.5,borderColor:'transparent'},
  catTxt:{fontSize:10,fontWeight:'500',color:COLORS.textSecondary,marginTop:4},
  ok:{backgroundColor:'#EDFAF3',borderRadius:12,padding:14,alignItems:'center'},
  quickGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},
  quickItem:{width:'30%',backgroundColor:'#fff',borderRadius:14,padding:12,alignItems:'center'},
  qName:{fontSize:11,fontWeight:'500',color:COLORS.dark,textAlign:'center'},
  qAmt:{fontSize:11,color:COLORS.textMuted,marginTop:2},
});
