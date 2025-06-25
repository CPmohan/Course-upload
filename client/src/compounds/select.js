import Select from "react-select";

function CustomSelect(props) {
  return (
    <div
      style={{
        marginTop: props.margin ? props.margin : 20,
        flex: !props.widthFull ? 3 : null,
        width: props.width,
      }}
    >
      {props.label ? (
        <label style={{ fontSize: 14 }}>{props.label}</label>
      ) : null}
      <div style={{ marginTop: props.label ? 5 : 0 }}>
        <Select
          isMulti={props.isMulti}
          styles={{
            control: (baseStyles) => ({
              ...baseStyles,
              backgroundColor: "rgb(238 241 249/1)",
              border: "1px solid #eaeaea",
              outlineColor: "#7D53F6",
              outline: "#7D53F6",
            }),
          }}
          onChange={(e) => {
            props.return === "target"
              ? props.onChange(e)
              : props.onChange(props.isMulti ? e : e.value);
          }}
          options={props.options}
          isSearchable={true}
          placeholder={props.placeholder}
        />
      </div>
    </div>
  );
}

export default CustomSelect;
