(function exposeNutrition() {
  const defaultNutrition = {
  'farinha':{kcal:361,carb:75,prot:9.8,fat:1.4,fiber:2.3,sodium:2},
  'açúcar refinado':{kcal:399,carb:99.6,prot:0,fat:0,fiber:0,sodium:1},
  'açúcar':{kcal:387,carb:99,prot:0,fat:0,fiber:0,sodium:1},
  'manteiga':{kcal:741,carb:0,prot:0.5,fat:83,fiber:0,sodium:576},
  'ovo':{kcal:146,carb:0.4,prot:12.6,fat:10,fiber:0,sodium:142},
  'leite':{kcal:61,carb:4.7,prot:3.2,fat:3.3,fiber:0,sodium:38},
  'sal':{kcal:0,carb:0,prot:0,fat:0,fiber:0,sodium:39300},
  'azeite':{kcal:884,carb:0,prot:0,fat:100,fiber:0,sodium:0},
  'óleo':{kcal:884,carb:0,prot:0,fat:100,fiber:0,sodium:0},
  'arroz':{kcal:358,carb:79,prot:7.4,fat:0.3,fiber:1.6,sodium:1},
  'feijão':{kcal:333,carb:61,prot:22,fat:1.6,fiber:15.5,sodium:5},
  'frango':{kcal:162,carb:0,prot:24,fat:7,fiber:0,sodium:75},
  'carne':{kcal:219,carb:0,prot:26,fat:13,fiber:0,sodium:66},
  'patinho':{kcal:219,carb:0,prot:26,fat:13,fiber:0,sodium:66},
  'tomate':{kcal:18,carb:3.9,prot:0.9,fat:0.2,fiber:1.2,sodium:5},
  'cebola':{kcal:40,carb:9.3,prot:1.1,fat:0.1,fiber:1.7,sodium:4},
  'alho':{kcal:149,carb:33,prot:6.4,fat:0.5,fiber:2.1,sodium:17},
  'fermento':{kcal:105,carb:8,prot:12,fat:2,fiber:4,sodium:50},
  'bicarbonato':{kcal:0,carb:0,prot:0,fat:0,fiber:0,sodium:27360},
  'chocolate':{kcal:546,carb:60,prot:5,fat:32,fiber:7,sodium:10},
  'creme de leite':{kcal:300,carb:3,prot:2.5,fat:30,fiber:0,sodium:40},
  'queijo':{kcal:350,carb:2,prot:25,fat:27,fiber:0,sodium:600},
  'vinagre':{kcal:22,carb:5,prot:0,fat:0,fiber:0,sodium:2},
  'mel':{kcal:304,carb:82,prot:0.3,fat:0,fiber:0,sodium:4},
  'default':{kcal:250,carb:30,prot:8,fat:5,fiber:2,sodium:100}
};

  function getNutrition(name) {
    const normalizedName = name.toLowerCase();

    for (const key in defaultNutrition) {
      if (normalizedName.includes(key)) return defaultNutrition[key];
    }

    return defaultNutrition.default;
  }

  window.FichaTecNutrition = {
    defaultNutrition,
    getNutrition,
  };
})();
