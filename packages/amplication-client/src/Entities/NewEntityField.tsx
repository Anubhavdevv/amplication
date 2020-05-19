import React, { useCallback, useEffect } from "react";
import { Link, useHistory, useRouteMatch } from "react-router-dom";
import { gql } from "apollo-boost";
import { useMutation } from "@apollo/react-hooks";
import { DrawerHeader, DrawerTitle, DrawerContent } from "@rmwc/drawer";
import "@rmwc/drawer/styles";
import { TextField } from "@rmwc/textfield";
import "@rmwc/textfield/styles";
import { Button } from "@rmwc/button";
import "@rmwc/button/styles";
import { Snackbar } from "@rmwc/snackbar";
import "@rmwc/snackbar/styles";
import { Switch } from "@rmwc/switch";
import "@rmwc/switch/styles";
import { Select } from "@rmwc/select";
import "@rmwc/select/styles";
import { formatError } from "../errorUtil";
import getFormData from "get-form-data";

type Props = {
  onCreate: () => void;
};

const DATA_TYPE_OPTIONS = [
  { value: "singleLineText", label: "Single Line Text" },
  { value: "multiLineText", label: "Multi Line Text" },
  { value: "email", label: "Email" },
  { value: "numbers", label: "Numbers" },
  { value: "autoNumber", label: "Auto Number" },
];

const NewEntityField = ({ onCreate }: Props) => {
  const match = useRouteMatch<{ application: string; entity: string }>(
    "/:application/entities/:entity/fields/new"
  );

  const { application, entity } = match?.params ?? {};

  const params = new URLSearchParams(window.location.search);
  const entityName = params.get("entity-name");

  const [createEntityField, { error, data }] = useMutation(CREATE_ENTITY);
  const history = useHistory();

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      const data = getFormData(event.target);
      createEntityField({
        variables: {
          data,
        },
      })
        .then(onCreate)
        .catch(console.error);
    },
    [createEntityField, onCreate, entity]
  );

  useEffect(() => {
    if (data) {
      history.push(`/${application}/entities/`);
    }
  }, [history, data, application]);

  const errorMessage = formatError(error);

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>{entityName} | New Entity Field</DrawerTitle>
      </DrawerHeader>

      <DrawerContent>
        <form onSubmit={handleSubmit}>
          <p>
            <TextField label="Name" name="name" minLength={1} />
          </p>
          <p>
            <TextField label="Display Name" name="displayName" minLength={1} />
          </p>
          <p>
            <Select
              options={DATA_TYPE_OPTIONS}
              defaultValue={DATA_TYPE_OPTIONS[0].value}
            />
          </p>
          <p>
            Required <Switch name="required" />
          </p>
          <p>
            Searchable <Switch name="searchable" />
          </p>
          <Button raised type="submit">
            Create
          </Button>
          <Link to={`/${application}/entities/`}>
            <Button type="button">Cancel</Button>
          </Link>
        </form>
      </DrawerContent>
      <Snackbar open={Boolean(error)} message={errorMessage} />
    </>
  );
};

export default NewEntityField;

const CREATE_ENTITY = gql`
  mutation createEntityField($data: EntityFieldCreateInput!) {
    createEntityField(data: $data) {
      id
    }
  }
`;
